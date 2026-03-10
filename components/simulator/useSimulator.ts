'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SimState, SimNode, Order, LogEntry } from './types';
import { getBufferZone, getZoneLabel } from './types';

/* ── Initial Configuration ── */

const createInitialNodes = (): SimNode[] => [
  {
    id: 'supplier',
    name: 'Поставщик',
    type: 'supplier',
    bufferMax: Infinity,
    bufferCurrent: Infinity,
    avgDemand: 0,
    demandStdev: 0,
    supplierId: null,
    leadTime: 0,
  },
  {
    id: 'warehouse',
    name: 'Центральный склад',
    type: 'warehouse',
    bufferMax: 300,
    bufferCurrent: 300,
    avgDemand: 0,
    demandStdev: 0,
    supplierId: 'supplier',
    leadTime: 5,
  },
  {
    id: 'retail-alpha',
    name: 'Магазин «Альфа»',
    type: 'retail',
    bufferMax: 100,
    bufferCurrent: 100,
    avgDemand: 10,
    demandStdev: 3,
    supplierId: 'warehouse',
    leadTime: 2,
  },
  {
    id: 'retail-beta',
    name: 'Магазин «Бета»',
    type: 'retail',
    bufferMax: 80,
    bufferCurrent: 80,
    avgDemand: 8,
    demandStdev: 2.5,
    supplierId: 'warehouse',
    leadTime: 2,
  },
  {
    id: 'retail-gamma',
    name: 'Магазин «Гамма»',
    type: 'retail',
    bufferMax: 60,
    bufferCurrent: 60,
    avgDemand: 6,
    demandStdev: 2,
    supplierId: 'warehouse',
    leadTime: 3,
  },
];

const createInitialState = (): SimState => ({
  nodes: createInitialNodes(),
  orders: [],
  day: 0,
  isRunning: false,
  speed: 800,
  log: [],
  stats: {
    totalDemand: 0,
    totalFulfilled: 0,
    stockouts: 0,
    ordersPlaced: 0,
  },
});

/* ── Helpers ── */

/** Box-Muller transform for gaussian random numbers */
function gaussianRandom(mean: number, stdev: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, Math.round(mean + z * stdev));
}

let _nextOrderId = 0;
let _nextLogId = 0;

/* ── Hook ── */

export function useSimulator() {
  const [state, setState] = useState<SimState>(createInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setState((prev) => {
      const newDay = prev.day + 1;
      const nodes = prev.nodes.map((n) => ({ ...n }));
      let orders = prev.orders.map((o) => ({ ...o }));
      const newLog: LogEntry[] = [];
      const stats = { ...prev.stats };

      const findNode = (id: string) => nodes.find((n) => n.id === id);

      /* ── Step 1: Generate demand at retail ── */
      for (const node of nodes) {
        if (node.type !== 'retail') continue;

        const demand = gaussianRandom(node.avgDemand, node.demandStdev);
        const fulfilled = Math.min(demand, node.bufferCurrent);
        node.bufferCurrent -= fulfilled;

        stats.totalDemand += demand;
        stats.totalFulfilled += fulfilled;

        if (fulfilled < demand) {
          stats.stockouts++;
          newLog.push({
            id: `log-${++_nextLogId}`,
            day: newDay,
            message: `⚠ ${node.name}: дефицит! Спрос ${demand}, отгружено ${fulfilled}`,
            type: 'warning',
          });
        } else {
          newLog.push({
            id: `log-${++_nextLogId}`,
            day: newDay,
            message: `${node.name}: потребление ${demand} ед.`,
            type: 'consumption',
          });
        }
      }

      /* ── Step 2: Advance orders in transit ── */
      for (const order of orders) {
        order.daysRemaining--;
      }

      /* ── Step 3: Deliver completed orders ── */
      const completed = orders.filter((o) => o.daysRemaining <= 0);
      for (const order of completed) {
        const dest = findNode(order.toId);
        if (dest && isFinite(dest.bufferMax)) {
          const space = dest.bufferMax - dest.bufferCurrent;
          const delivered = Math.min(order.quantity, space);
          dest.bufferCurrent += delivered;

          newLog.push({
            id: `log-${++_nextLogId}`,
            day: newDay,
            message: `📦 Доставка → ${dest.name}: +${delivered} ед.`,
            type: 'delivery',
          });
        }
      }
      orders = orders.filter((o) => o.daysRemaining > 0);

      /* ── Step 4: DBR Replenishment — The Rope ── */
      for (const node of nodes) {
        if (node.type === 'supplier' || !node.supplierId) continue;

        const supplier = findNode(node.supplierId);
        if (!supplier) continue;

        const zone = getBufferZone(node.bufferCurrent, node.bufferMax);

        // Calculate pending incoming quantity
        const pendingIncoming = orders
          .filter((o) => o.toId === node.id)
          .reduce((sum, o) => sum + o.quantity, 0);

        const effectiveStock = node.bufferCurrent + pendingIncoming;

        // Place order when buffer penetrates below green zone top (67%)
        // and effective stock is below 80% of max
        if (effectiveStock < node.bufferMax * 0.67) {
          const orderQty = Math.round(node.bufferMax - effectiveStock);

          if (orderQty > 0) {
            // Deduct from supplier stock (infinite for external supplier)
            let actualQty = orderQty;
            if (isFinite(supplier.bufferCurrent)) {
              actualQty = Math.min(orderQty, supplier.bufferCurrent);
              supplier.bufferCurrent -= actualQty;
            }

            if (actualQty > 0) {
              const order: Order = {
                id: `order-${++_nextOrderId}`,
                quantity: actualQty,
                fromId: supplier.id,
                toId: node.id,
                daysRemaining: node.leadTime,
                totalDays: node.leadTime,
                createdDay: newDay,
              };
              orders.push(order);
              stats.ordersPlaced++;

              newLog.push({
                id: `log-${++_nextLogId}`,
                day: newDay,
                message: `🔗 Канат: ${node.name} ← заказ ${actualQty} ед. (${getZoneLabel(zone)})`,
                type: 'order',
              });
            }
          }
        }
      }

      return {
        ...prev,
        day: newDay,
        nodes,
        orders,
        log: [...newLog, ...prev.log].slice(0, 200),
        stats,
      };
    });
  }, []);

  /* ── Interval Management ── */
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

  /* ── Controls ── */
  const toggleRunning = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const reset = useCallback(() => {
    _nextOrderId = 0;
    _nextLogId = 0;
    setState(createInitialState());
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  return { state, toggleRunning, reset, setSpeed };
}
