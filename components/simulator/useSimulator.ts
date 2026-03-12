'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SimState, SimNode, Order, LogEntry, ProductionOrder, SimConfig } from './types';
import { getBufferZone, getZoneLabel, DEFAULT_CONFIG } from './types';

/* ── Build nodes from config ── */

const createNodesFromConfig = (config: SimConfig): SimNode[] => [
  {
    id: 'supplier',
    name: 'Производство',
    type: 'supplier',
    bufferMax: 0,
    bufferCurrent: 0,
    avgDemand: 0,
    demandStdev: 0,
    supplierId: null,
    leadTime: 0,
    productionLeadTime: config.supplier.productionLeadTime,
    productionCapacity: config.supplier.productionCapacity,
  },
  {
    id: 'warehouse',
    name: 'Центральный склад',
    type: 'warehouse',
    bufferMax: config.warehouse.bufferMax,
    bufferCurrent: config.warehouse.bufferMax,
    avgDemand: 0,
    demandStdev: 0,
    supplierId: 'supplier',
    leadTime: config.warehouse.leadTime,
  },
  ...config.retailers.map((r) => ({
    id: r.id,
    name: r.name,
    type: 'retail' as const,
    bufferMax: r.bufferMax,
    bufferCurrent: r.bufferMax,
    avgDemand: r.avgDemand,
    demandStdev: r.demandStdev,
    supplierId: 'warehouse',
    leadTime: r.leadTime,
  })),
];

const createInitialState = (config: SimConfig): SimState => ({
  nodes: createNodesFromConfig(config),
  orders: [],
  productionQueue: [],
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
let _nextProdId = 0;

/* ── Hook ── */

export function useSimulator() {
  const configRef = useRef<SimConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<SimState>(() => createInitialState(DEFAULT_CONFIG));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setState((prev) => {
      const newDay = prev.day + 1;
      const nodes = prev.nodes.map((n) => ({ ...n }));
      let orders = prev.orders.map((o) => ({ ...o }));
      let prodQueue = prev.productionQueue.map((p) => ({ ...p }));
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

      /* ── Step 3: Deliver completed shipping orders ── */
      const completed = orders.filter((o) => o.daysRemaining <= 0);
      for (const order of completed) {
        const dest = findNode(order.toId);
        if (dest && isFinite(dest.bufferMax) && dest.bufferMax > 0) {
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

      /* ── Step 4: Advance production queue & complete ── */
      for (const prod of prodQueue) {
        prod.daysRemaining--;
      }
      const completedProd = prodQueue.filter((p) => p.daysRemaining <= 0);
      for (const prod of completedProd) {
        const targetNode = findNode(prod.targetNodeId);
        if (targetNode) {
          // Production complete → create shipping order
          const shippingOrder: Order = {
            id: `order-${++_nextOrderId}`,
            quantity: prod.quantity,
            fromId: 'supplier',
            toId: prod.targetNodeId,
            daysRemaining: targetNode.leadTime,
            totalDays: targetNode.leadTime,
            createdDay: newDay,
          };
          orders.push(shippingOrder);

          newLog.push({
            id: `log-${++_nextLogId}`,
            day: newDay,
            message: `🏭 Произведено ${prod.quantity} ед. → отгрузка в ${targetNode.name}`,
            type: 'delivery',
          });
        }
      }
      prodQueue = prodQueue.filter((p) => p.daysRemaining > 0);

      /* ── Step 5: DBR Replenishment — The Rope ── */
      for (const node of nodes) {
        if (node.type === 'supplier' || !node.supplierId) continue;

        const supplier = findNode(node.supplierId);
        if (!supplier) continue;

        const zone = getBufferZone(node.bufferCurrent, node.bufferMax);

        // Calculate pending incoming (shipping orders + production orders destined here)
        const pendingShipping = orders
          .filter((o) => o.toId === node.id)
          .reduce((sum, o) => sum + o.quantity, 0);

        const pendingProduction = prodQueue
          .filter((p) => p.targetNodeId === node.id)
          .reduce((sum, p) => sum + p.quantity, 0);

        const effectiveStock = node.bufferCurrent + pendingShipping + pendingProduction;

        // Place order when buffer penetrates below green zone top (67%)
        if (effectiveStock < node.bufferMax * 0.67) {
          const orderQty = Math.round(node.bufferMax - effectiveStock);

          if (orderQty > 0) {
            if (supplier.type === 'supplier') {
              // Make-to-order: create production order
              // Duration depends on capacity (Drum) — large orders take longer
              const prodLeadTime = supplier.productionLeadTime || 3;
              const prodCapacity = supplier.productionCapacity || 35;
              const productionDays = Math.max(prodLeadTime, Math.ceil(orderQty / prodCapacity));
              const prodOrder: ProductionOrder = {
                id: `prod-${++_nextProdId}`,
                quantity: orderQty,
                daysRemaining: productionDays,
                totalDays: productionDays,
                targetNodeId: node.id,
                createdDay: newDay,
              };
              prodQueue.push(prodOrder);
              stats.ordersPlaced++;

              newLog.push({
                id: `log-${++_nextLogId}`,
                day: newDay,
                message: `🔗 Канат: ${node.name} ← производство ${orderQty} ед. (${getZoneLabel(zone)})`,
                type: 'order',
              });
            } else {
              // Regular order from non-supplier node
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
      }

      return {
        ...prev,
        day: newDay,
        nodes,
        orders,
        productionQueue: prodQueue,
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

  const reset = useCallback((newConfig?: SimConfig) => {
    _nextOrderId = 0;
    _nextLogId = 0;
    _nextProdId = 0;
    const cfg = newConfig ?? configRef.current;
    configRef.current = cfg;
    setState(createInitialState(cfg));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  return { state, toggleRunning, reset, setSpeed, config: configRef.current };
}
