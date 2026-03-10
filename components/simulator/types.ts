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
  /** Lead time in days from supplier */
  leadTime: number;
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
  day: number;
  isRunning: boolean;
  speed: number;
  log: LogEntry[];
  stats: SimStats;
}

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
