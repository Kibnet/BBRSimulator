/* ── DBR Simulator Types ── */

export interface SimNode {
  id: string;
  name: string;
  type: 'supplier' | 'warehouse' | 'retail';
  bufferMax: number;
  bufferCurrent: number;
  /** Average daily demand (retail) or 0 for non-demand nodes */
  avgDemand: number;
  /** Standard deviation of demand */
  demandStdev: number;
  /** ID of the upstream supplier node */
  supplierId: string | null;
  /** Lead time in days from supplier (shipping) */
  leadTime: number;
  /** Production lead time in days (supplier only) */
  productionLeadTime?: number;
  /** Max units producible per day — the Drum (supplier only) */
  productionCapacity?: number;
}

export interface ProductionOrder {
  id: string;
  quantity: number;
  daysRemaining: number;
  totalDays: number;
  /** Which node requested this production */
  targetNodeId: string;
  createdDay: number;
}

export interface Order {
  id: string;
  quantity: number;
  fromId: string;
  toId: string;
  daysRemaining: number;
  totalDays: number;
  createdDay: number;
}

export interface LogEntry {
  id: string;
  day: number;
  message: string;
  type: 'order' | 'delivery' | 'consumption' | 'warning' | 'info';
}

export interface SimStats {
  totalDemand: number;
  totalFulfilled: number;
  stockouts: number;
  ordersPlaced: number;
}

export interface SimState {
  nodes: SimNode[];
  orders: Order[];
  productionQueue: ProductionOrder[];
  day: number;
  isRunning: boolean;
  speed: number;
  log: LogEntry[];
  stats: SimStats;
}

/* ── Editable Configuration ── */

export interface RetailerConfig {
  id: string;
  name: string;
  bufferMax: number;
  avgDemand: number;
  demandStdev: number;
  leadTime: number;
}

export interface SimConfig {
  supplier: {
    productionLeadTime: number;
    productionCapacity: number;
  };
  warehouse: {
    bufferMax: number;
    leadTime: number;
  };
  retailers: RetailerConfig[];
}

export const DEFAULT_CONFIG: SimConfig = {
  supplier: {
    productionLeadTime: 3,
    productionCapacity: 35,
  },
  warehouse: {
    bufferMax: 300,
    leadTime: 5,
  },
  retailers: [
    { id: 'retail-alpha', name: 'Магазин «Альфа»', bufferMax: 100, avgDemand: 10, demandStdev: 3, leadTime: 2 },
    { id: 'retail-beta', name: 'Магазин «Бета»', bufferMax: 80, avgDemand: 8, demandStdev: 2.5, leadTime: 2 },
    { id: 'retail-gamma', name: 'Магазин «Гамма»', bufferMax: 60, avgDemand: 6, demandStdev: 2, leadTime: 3 },
  ],
};

/* ── Launch Profiles ── */

export interface SimProfile {
  id: string;
  name: string;
  description: string;
  config: SimConfig;
}

export const PROFILES: SimProfile[] = [
  {
    id: 'balanced',
    name: 'Сбалансированный',
    description: 'Мощность производства покрывает спрос, буферы достаточны',
    config: DEFAULT_CONFIG,
  },
  {
    id: 'bottleneck',
    name: 'Узкое горлышко',
    description: 'Мощность производства ниже совокупного спроса — дефициты неизбежны',
    config: {
      supplier: { productionLeadTime: 3, productionCapacity: 15 },
      warehouse: { bufferMax: 200, leadTime: 5 },
      retailers: [
        { id: 'retail-alpha', name: 'Магазин «Альфа»', bufferMax: 80, avgDemand: 10, demandStdev: 3, leadTime: 2 },
        { id: 'retail-beta', name: 'Магазин «Бета»', bufferMax: 60, avgDemand: 8, demandStdev: 2.5, leadTime: 2 },
        { id: 'retail-gamma', name: 'Магазин «Гамма»', bufferMax: 50, avgDemand: 6, demandStdev: 2, leadTime: 3 },
      ],
    },
  },
  {
    id: 'high-demand',
    name: 'Высокий спрос',
    description: 'Повышенный спрос с большим разбросом, крупные буферы',
    config: {
      supplier: { productionLeadTime: 3, productionCapacity: 60 },
      warehouse: { bufferMax: 500, leadTime: 5 },
      retailers: [
        { id: 'retail-alpha', name: 'Магазин «Альфа»', bufferMax: 150, avgDemand: 18, demandStdev: 6, leadTime: 2 },
        { id: 'retail-beta', name: 'Магазин «Бета»', bufferMax: 120, avgDemand: 14, demandStdev: 5, leadTime: 2 },
        { id: 'retail-gamma', name: 'Магазин «Гамма»', bufferMax: 100, avgDemand: 12, demandStdev: 4, leadTime: 3 },
      ],
    },
  },
  {
    id: 'long-chain',
    name: 'Длинная цепочка',
    description: 'Долгие сроки доставки и производства — проверка устойчивости',
    config: {
      supplier: { productionLeadTime: 7, productionCapacity: 35 },
      warehouse: { bufferMax: 400, leadTime: 10 },
      retailers: [
        { id: 'retail-alpha', name: 'Магазин «Альфа»', bufferMax: 120, avgDemand: 10, demandStdev: 3, leadTime: 5 },
        { id: 'retail-beta', name: 'Магазин «Бета»', bufferMax: 100, avgDemand: 8, demandStdev: 2.5, leadTime: 4 },
        { id: 'retail-gamma', name: 'Магазин «Гамма»', bufferMax: 80, avgDemand: 6, demandStdev: 2, leadTime: 6 },
      ],
    },
  },
  {
    id: 'small-buffers',
    name: 'Малые буферы',
    description: 'Минимальные запасы — высокий риск дефицита при любых колебаниях',
    config: {
      supplier: { productionLeadTime: 3, productionCapacity: 35 },
      warehouse: { bufferMax: 100, leadTime: 5 },
      retailers: [
        { id: 'retail-alpha', name: 'Магазин «Альфа»', bufferMax: 30, avgDemand: 10, demandStdev: 3, leadTime: 2 },
        { id: 'retail-beta', name: 'Магазин «Бета»', bufferMax: 25, avgDemand: 8, demandStdev: 2.5, leadTime: 2 },
        { id: 'retail-gamma', name: 'Магазин «Гамма»', bufferMax: 20, avgDemand: 6, demandStdev: 2, leadTime: 3 },
      ],
    },
  },
];

export type BufferZone = 'green' | 'yellow' | 'red' | 'black';

/** Determine which buffer zone the current stock falls into */
export function getBufferZone(current: number, max: number): BufferZone {
  if (!isFinite(max) || max === 0) return 'green';
  const ratio = current / max;
  if (ratio > 2 / 3) return 'green';
  if (ratio > 1 / 3) return 'yellow';
  if (ratio > 0) return 'red';
  return 'black';
}

/** Get a human-readable Russian label for a buffer zone */
export function getZoneLabel(zone: BufferZone): string {
  switch (zone) {
    case 'green': return 'зелёная';
    case 'yellow': return 'жёлтая';
    case 'red': return 'красная';
    case 'black': return 'дефицит';
  }
}
