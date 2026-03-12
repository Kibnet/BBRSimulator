'use client';

import type { Machine, CustomerOrder } from './types';
import { getOrderZone, ZONE_COLORS, ZONE_BG, ZONE_BORDER } from './types';
import { Cog } from 'lucide-react';

interface MachineCardProps {
  machine: Machine;
  order: CustomerOrder | null;
  currentDay: number;
}

export function MachineCard({ machine, order, currentDay }: MachineCardProps) {
  const isIdle = !order;
  const zone = order ? getOrderZone(order, currentDay) : null;
  const progress = order && order.processingTotal > 0
    ? ((order.processingTotal - order.processingRemaining) / order.processingTotal) * 100
    : 0;

  return (
    <div
      className={`rounded-lg border p-2.5 transition-all duration-300 ${
        isIdle ? 'border-border bg-secondary/30' : ''
      }`}
      style={
        !isIdle && zone
          ? {
              borderColor: ZONE_BORDER[zone],
              background: ZONE_BG[zone],
            }
          : undefined
      }
    >
      {/* Machine header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Cog
            className={`w-3 h-3 flex-shrink-0 ${
              isIdle ? 'text-muted-foreground' : 'animate-spin'
            }`}
            style={
              !isIdle && zone
                ? { color: ZONE_COLORS[zone], animationDuration: '2s' }
                : undefined
            }
          />
          <span className="text-[11px] font-medium text-foreground">{machine.name}</span>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono tabular-nums">
          {machine.capacity} ед/дн
        </span>
      </div>

      {order ? (
        <div>
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold font-mono"
              style={{ color: ZONE_COLORS[zone!] }}
            >
              {order.number}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
              {order.quantity} ед · {order.processingRemaining} дн
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: ZONE_COLORS[zone!],
              }}
            />
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/60 italic">простаивает</p>
      )}
    </div>
  );
}
