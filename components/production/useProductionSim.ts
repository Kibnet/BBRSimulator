'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CustomerOrder, Machine, ProdLogEntry, ProdSimState, ProdStats, ProdConfig } from './types';
import { DEFAULT_MACHINES, getBufferPenetration, DEFAULT_PROD_CONFIG, buildMachinesFromConfig } from './types';

/* ── Counters ── */
let _orderId = 0;
let _logId = 0;

/* ── Helpers ── */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Next status after completing an operation */
function nextStatus(current: CustomerOrder['status']): CustomerOrder['status'] {
  switch (current) {
    case 'queued': return 'op1';
    case 'op1': return 'wip1';
    case 'wip1': return 'op2';
    case 'op2': return 'wip2';
    case 'wip2': return 'op3';
    case 'op3': return 'finished';
    default: return current;
  }
}

/** Which operation stage does this status belong to? (0 = none) */
function statusToOp(status: CustomerOrder['status']): number {
  if (status === 'op1') return 1;
  if (status === 'op2') return 2;
  if (status === 'op3') return 3;
  return 0;
}

/** Which WIP status feeds into an operation */
function wipForOp(opId: number): CustomerOrder['status'] | null {
  if (opId === 1) return 'queued';
  if (opId === 2) return 'wip1';
  if (opId === 3) return 'wip2';
  return null;
}

const OP_NAMES: Record<number, string> = { 1: 'Заготовка', 2: 'Обработка', 3: 'Сборка' };

/* ── Initial state ── */
function createInitialState(config: ProdConfig): ProdSimState {
  return {
    day: 0,
    isRunning: false,
    speed: 800,
    orders: [],
    machines: buildMachinesFromConfig(config),
    log: [],
    stats: { totalOrders: 0, shippedOnTime: 0, shippedLate: 0, totalShipped: 0 },
  };
}

/* ── Hook ── */
export function useProductionSim() {
  const configRef = useRef<ProdConfig>(DEFAULT_PROD_CONFIG);
  const [state, setState] = useState<ProdSimState>(() => createInitialState(DEFAULT_PROD_CONFIG));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setState((prev) => {
      const newDay = prev.day + 1;
      const orders = prev.orders.map((o) => ({ ...o }));
      const machines = prev.machines.map((m) => ({ ...m }));
      const newLog: ProdLogEntry[] = [];
      const stats: ProdStats = { ...prev.stats };

      const findOrder = (id: string) => orders.find((o) => o.id === id);
      const findMachine = (id: string) => machines.find((m) => m.id === id);

      /* ── Step 1: Generate new customer orders ── */
      const cfg = configRef.current;
      const og = cfg.orderGen;
      // ordersPerDay e.g. 1.2 means ~1.2 orders per day on average
      let newOrderCount = Math.floor(og.ordersPerDay);
      if (Math.random() < (og.ordersPerDay - newOrderCount)) newOrderCount++;
      for (let i = 0; i < newOrderCount; i++) {
        const qty = randInt(og.qtyMin, og.qtyMax);

        let bufferDays: number;
        if (cfg.dynamicDueDates) {
          // Calculate realistic due date based on current system load
          const drumMachines = machines.filter((m) => m.operationId === 2);
          const drumCapacity = drumMachines.reduce((s, m) => s + m.capacity, 0) || 1;
          const op1Capacity = machines.filter((m) => m.operationId === 1).reduce((s, m) => s + m.capacity, 0) || 1;
          const op3Capacity = machines.filter((m) => m.operationId === 3).reduce((s, m) => s + m.capacity, 0) || 1;

          // ALL unfinished orders occupy the drum queue
          const allActive = orders.filter(
            (o) => !['finished', 'shipped'].includes(o.status)
          );
          const totalQtyInSystem = allActive.reduce((s, o) => s + o.quantity, 0);

          // Estimated processing time for this order through each operation
          const op1Days = Math.ceil(qty / op1Capacity);
          const drumDays = Math.ceil(qty / drumCapacity);
          const op3Days = Math.ceil(qty / op3Capacity);

          // Wait time at drum = all queued qty / drum capacity
          const drumWaitDays = Math.ceil(totalQtyInSystem / drumCapacity);

          // Buffer = total execution time across all operations × 3
          const totalExecTime = op1Days + drumWaitDays + drumDays + op3Days;
          bufferDays = totalExecTime * 3;
        } else {
          bufferDays = randInt(og.bufferMin, og.bufferMax);
        }
        const order: CustomerOrder = {
          id: `co-${++_orderId}`,
          number: `ЗК-${String(_orderId).padStart(3, '0')}`,
          quantity: qty,
          createdDay: newDay,
          dueDay: newDay + bufferDays,
          bufferDays,
          status: 'queued',
          machineId: null,
          processingRemaining: 0,
          processingTotal: 0,
          quantityCompleted: 0,
        };
        orders.push(order);
        stats.totalOrders++;

        newLog.push({
          id: `log-${++_logId}`,
          day: newDay,
          message: `📋 Новый заказ ${order.number}: ${qty} ед., срок — день ${order.dueDay}`,
          type: 'order',
        });
      }

      /* ── Step 2: Advance processing on machines ── */
      for (const machine of machines) {
        if (!machine.currentOrderId) continue;
        const order = findOrder(machine.currentOrderId);
        if (!order) { machine.currentOrderId = null; continue; }

        order.processingRemaining--;

        if (order.processingRemaining <= 0) {
          // Operation complete — move to next stage
          const completedOp = statusToOp(order.status);
          const newStatus = nextStatus(order.status);
          order.status = newStatus;
          order.machineId = null;
          machine.currentOrderId = null;

          if (newStatus === 'finished') {
            newLog.push({
              id: `log-${++_logId}`,
              day: newDay,
              message: `✅ ${order.number} — производство завершено → склад ГП`,
              type: 'complete',
            });
          } else {
            newLog.push({
              id: `log-${++_logId}`,
              day: newDay,
              message: `⚙ ${order.number} — ${OP_NAMES[completedOp]} завершена → ${newStatus === 'wip1' ? 'буфер п/ф 1' : newStatus === 'wip2' ? 'буфер п/ф 2' : OP_NAMES[statusToOp(newStatus)]}`,
              type: 'info',
            });
          }
        }
      }

      /* ── Step 3: Assign orders to idle machines (priority by buffer penetration) ── */
      for (const opId of [2, 1, 3]) {
        // Process constraint (Op2) first, then others
        const opMachines = machines.filter(
          (m) => m.operationId === opId && m.currentOrderId === null
        );
        if (opMachines.length === 0) continue;

        const feedStatus = wipForOp(opId);
        if (!feedStatus) continue;

        // ── Rope: if enabled, block release to Op1 when WIP before drum is at limit ──
        if (opId === 1 && cfg.ropeEnabled) {
          const wipBeforeDrum = orders.filter(
            (o) => o.status === 'op1' || o.status === 'wip1'
          ).length;
          if (wipBeforeDrum >= cfg.ropeWIPLimit) {
            // Rope holds — don't start new work
            continue;
          }
        }

        // Get waiting orders for this operation, sorted by priority (highest penetration first)
        const waiting = orders
          .filter((o) => o.status === feedStatus)
          .sort((a, b) => getBufferPenetration(b, newDay) - getBufferPenetration(a, newDay));

        for (const machine of opMachines) {
          const order = waiting.shift();
          if (!order) break;

          // Calculate processing time based on machine capacity
          const processingDays = Math.max(1, Math.ceil(order.quantity / machine.capacity));
          order.status = `op${opId}` as CustomerOrder['status'];
          order.machineId = machine.id;
          order.processingRemaining = processingDays;
          order.processingTotal = processingDays;
          machine.currentOrderId = order.id;

          newLog.push({
            id: `log-${++_logId}`,
            day: newDay,
            message: `🔧 ${order.number} → ${machine.name} (${OP_NAMES[opId]}, ${processingDays} дн.)`,
            type: 'release',
          });
        }
      }

      /* ── Step 4: Ship finished orders that are due ── */
      for (const order of orders) {
        if (order.status !== 'finished') continue;

        // Ship if due today or overdue
        if (newDay >= order.dueDay) {
          const wasLate = newDay > order.dueDay;
          order.status = 'shipped';
          stats.totalShipped++;
          if (wasLate) {
            stats.shippedLate++;
            newLog.push({
              id: `log-${++_logId}`,
              day: newDay,
              message: `⚠ ${order.number} — отгружен с ОПОЗДАНИЕМ (${newDay - order.dueDay} дн.)`,
              type: 'warning',
            });
          } else {
            stats.shippedOnTime++;
            newLog.push({
              id: `log-${++_logId}`,
              day: newDay,
              message: `📦 ${order.number} — отгружен вовремя`,
              type: 'ship',
            });
          }
        }
      }

      /* ── Step 5: Also ship finished orders that are ready early (1 day before due) ── */
      for (const order of orders) {
        if (order.status !== 'finished') continue;
        if (newDay >= order.dueDay - 1) {
          order.status = 'shipped';
          stats.totalShipped++;
          stats.shippedOnTime++;
          newLog.push({
            id: `log-${++_logId}`,
            day: newDay,
            message: `📦 ${order.number} — отгружен досрочно`,
            type: 'ship',
          });
        }
      }

      // Remove shipped orders older than 5 days to keep list manageable
      const activeOrders = orders.filter(
        (o) => o.status !== 'shipped' || newDay - o.dueDay < 5
      );

      return {
        ...prev,
        day: newDay,
        orders: activeOrders,
        machines,
        log: [...newLog, ...prev.log].slice(0, 200),
        stats,
      };
    });
  }, []);

  /* ── Interval ── */
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(tick, state.speed);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.speed, tick]);

  const toggleRunning = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const reset = useCallback((newConfig?: ProdConfig) => {
    _orderId = 0;
    _logId = 0;
    const cfg = newConfig ?? configRef.current;
    configRef.current = cfg;
    setState(createInitialState(cfg));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const toggleRope = useCallback(() => {
    configRef.current = {
      ...configRef.current,
      ropeEnabled: !configRef.current.ropeEnabled,
    };
  }, []);

  const toggleDynamicDueDates = useCallback(() => {
    configRef.current = {
      ...configRef.current,
      dynamicDueDates: !configRef.current.dynamicDueDates,
    };
  }, []);

  return { state, toggleRunning, reset, setSpeed, config: configRef.current, toggleRope, toggleDynamicDueDates };
}
