'use client';

import type { CustomerOrder, SegmentedBufferPenetration } from './types';
import { getOrderZone, getBufferPenetration, getSegmentedBufferPenetration, ZONE_COLORS } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface BufferStatusProps {
  orders: CustomerOrder[];
  currentDay: number;
}

export function BufferStatus({ orders, currentDay }: BufferStatusProps) {
  // Only count active orders (not shipped)
  const active = orders.filter((o) => o.status !== 'shipped');

  // Count orders by zone
  const zones = { green: 0, yellow: 0, red: 0, black: 0 };
  for (const o of active) {
    const zone = getOrderZone(o, currentDay);
    zones[zone]++;
  }

  const total = active.length || 1;
  const greenPct = (zones.green / total) * 100;
  const yellowPct = (zones.yellow / total) * 100;
  const redPct = (zones.red / total) * 100;
  const blackPct = (zones.black / total) * 100;

  // Average buffer penetration
  const avgPenetration = active.length > 0
    ? active.reduce((sum, o) => sum + getBufferPenetration(o, currentDay), 0) / active.length
    : 0;

  // Average segmented buffer penetration
  const avgSegmented: SegmentedBufferPenetration = active.length > 0
    ? active.reduce(
        (acc, o) => {
          const seg = getSegmentedBufferPenetration(o, currentDay);
          return {
            rope: acc.rope + seg.rope,
            drum: acc.drum + seg.drum,
            shipping: acc.shipping + seg.shipping,
            total: acc.total + seg.total,
          };
        },
        { rope: 0, drum: 0, shipping: 0, total: 0 }
      )
    : { rope: 0, drum: 0, shipping: 0, total: 0 };
  
  if (active.length > 0) {
    avgSegmented.rope /= active.length;
    avgSegmented.drum /= active.length;
    avgSegmented.shipping /= active.length;
    avgSegmented.total /= active.length;
  }

  // Buffer health: % of orders still in green zone
  const healthPct = active.length > 0 ? (zones.green / active.length) * 100 : 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Защитный буфер
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Zone distribution bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Распределение заказов по зонам</span>
            <span className="text-[10px] text-muted-foreground font-mono">{active.length} акт.</span>
          </div>
          <div className="h-5 rounded-md overflow-hidden flex bg-muted">
            {zones.green > 0 && (
              <div
                className="h-full flex items-center justify-center transition-all duration-500"
                style={{ width: `${greenPct}%`, background: ZONE_COLORS.green }}
              >
                {greenPct > 12 && (
                  <span className="text-[9px] font-bold text-background">{zones.green}</span>
                )}
              </div>
            )}
            {zones.yellow > 0 && (
              <div
                className="h-full flex items-center justify-center transition-all duration-500"
                style={{ width: `${yellowPct}%`, background: ZONE_COLORS.yellow }}
              >
                {yellowPct > 12 && (
                  <span className="text-[9px] font-bold text-background">{zones.yellow}</span>
                )}
              </div>
            )}
            {zones.red > 0 && (
              <div
                className="h-full flex items-center justify-center transition-all duration-500"
                style={{ width: `${redPct}%`, background: ZONE_COLORS.red }}
              >
                {redPct > 12 && (
                  <span className="text-[9px] font-bold text-background">{zones.red}</span>
                )}
              </div>
            )}
            {zones.black > 0 && (
              <div
                className="h-full flex items-center justify-center transition-all duration-500"
                style={{ width: `${blackPct}%`, background: ZONE_COLORS.black }}
              >
                {blackPct > 12 && (
                  <span className="text-[9px] font-bold text-foreground">{zones.black}</span>
                )}
              </div>
            )}
          </div>
          {/* Legend row */}
          <div className="flex gap-3 mt-1.5">
            <ZoneCount color={ZONE_COLORS.green} label="Зел" count={zones.green} />
            <ZoneCount color={ZONE_COLORS.yellow} label="Жёл" count={zones.yellow} />
            <ZoneCount color={ZONE_COLORS.red} label="Кр" count={zones.red} />
            <ZoneCount color={ZONE_COLORS.black} label="Чёр" count={zones.black} />
          </div>
        </div>

        {/* Average penetration gauge */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Среднее проникновение в буфер</span>
            <span className="text-xs font-mono font-bold tabular-nums text-foreground">
              {Math.round(avgPenetration)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-muted">
            {/* Zone background */}
            <div className="relative h-full w-full flex">
              <div className="w-1/3 h-full" style={{ background: 'hsl(142 71% 45% / 0.15)' }} />
              <div className="w-1/3 h-full" style={{ background: 'hsl(45 93% 47% / 0.12)' }} />
              <div className="w-1/3 h-full" style={{ background: 'hsl(0 72% 51% / 0.12)' }} />
              {/* Fill */}
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, avgPenetration)}%`,
                  background: avgPenetration > 67
                    ? ZONE_COLORS.red
                    : avgPenetration > 33
                    ? ZONE_COLORS.yellow
                    : ZONE_COLORS.green,
                }}
              />
              {/* Zone markers */}
              <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: '33.3%' }} />
              <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: '66.6%' }} />
            </div>
          </div>
        </div>

        {/* Segmented buffer penetration (Rope / Drum / Shipping) */}
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">Сегменты буфера</div>
          <div className="space-y-1">
            <SegmentBar label="Канат" value={avgSegmented.rope} color="hsl(210 80% 55%)" />
            <SegmentBar label="Барабан" value={avgSegmented.drum} color="hsl(280 70% 55%)" />
            <SegmentBar label="Отгрузка" value={avgSegmented.shipping} color="hsl(30 90% 50%)" />
          </div>
        </div>

        {/* Buffer health */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-[10px] text-muted-foreground">Здоровье буфера</span>
          <span
            className="text-xs font-mono font-bold"
            style={{
              color: healthPct > 60
                ? ZONE_COLORS.green
                : healthPct > 30
                ? ZONE_COLORS.yellow
                : ZONE_COLORS.red,
            }}
          >
            {Math.round(healthPct)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ZoneCount({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span className="text-[9px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

function SegmentBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const zoneColor =
    clampedValue >= 67 ? ZONE_COLORS.red : clampedValue >= 33 ? ZONE_COLORS.yellow : ZONE_COLORS.green;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-muted-foreground w-14 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted relative">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedValue}%`,
            background: zoneColor,
          }}
        />
        {/* Zone markers */}
        <div className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: '33.3%' }} />
        <div className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: '66.6%' }} />
      </div>
      <span className="text-[9px] font-mono tabular-nums w-8 text-right" style={{ color: zoneColor }}>
        {Math.round(clampedValue)}%
      </span>
    </div>
  );
}
