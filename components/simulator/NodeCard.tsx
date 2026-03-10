'use client';

import type { SimNode, Order } from './types';
import { getBufferZone } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Factory, Warehouse, Store, Package } from 'lucide-react';

const icons = {
  supplier: Factory,
  warehouse: Warehouse,
  retail: Store,
};

interface NodeCardProps {
  node: SimNode;
  orders: Order[];
}

export function NodeCard({ node, orders }: NodeCardProps) {
  const Icon = icons[node.type];
  const zone = getBufferZone(node.bufferCurrent, node.bufferMax);
  const pendingOrders = orders.filter((o) => o.toId === node.id);
  const isSupplier = node.type === 'supplier';
  const fillPercent = isSupplier
    ? 100
    : Math.min(100, (node.bufferCurrent / node.bufferMax) * 100);

  const zoneGlow =
    zone === 'red' || zone === 'black' ? 'glow-red' : '';

  /* Dynamic fill color based on current zone */
  const fillColor =
    zone === 'green'
      ? 'hsl(142 71% 45%)'
      : zone === 'yellow'
      ? 'hsl(45 93% 47%)'
      : 'hsl(0 72% 51%)';

  const fillColorFaded =
    zone === 'green'
      ? 'hsl(142 71% 45% / 0.5)'
      : zone === 'yellow'
      ? 'hsl(45 93% 47% / 0.5)'
      : 'hsl(0 72% 51% / 0.5)';

  return (
    <Card
      className={`transition-all duration-500 h-full ${zoneGlow}`}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
              {node.name}
            </h3>
            {!isSupplier && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                Буфер: {node.bufferMax} ед. · Время: {node.leadTime} дн.
              </p>
            )}
          </div>
        </div>

        {isSupplier ? (
          <div className="text-center py-6">
            <span className="text-4xl font-mono font-bold text-primary">
              ∞
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              Неограниченный запас
            </p>
          </div>
        ) : (
          <>
            {/* Buffer gauge — horizontal bar */}
            <div className="relative h-10 rounded-md overflow-hidden bg-muted mb-3">
              {/* Zone background stripes */}
              <div className="absolute inset-0 flex">
                <div
                  className="w-1/3 border-r"
                  style={{
                    borderColor: 'hsl(var(--background) / 0.4)',
                    background: 'hsl(0 72% 51% / 0.08)',
                  }}
                />
                <div
                  className="w-1/3 border-r"
                  style={{
                    borderColor: 'hsl(var(--background) / 0.4)',
                    background: 'hsl(45 93% 47% / 0.06)',
                  }}
                />
                <div
                  className="w-1/3"
                  style={{ background: 'hsl(142 71% 45% / 0.05)' }}
                />
              </div>

              {/* Fill level */}
              <div
                className="absolute top-0 left-0 bottom-0 transition-all duration-700 ease-out"
                style={{
                  width: `${fillPercent}%`,
                  background: `linear-gradient(90deg, ${fillColor}, ${fillColorFaded})`,
                  borderRadius: '0 4px 4px 0',
                }}
              />

              {/* Zone boundary labels */}
              <div className="absolute inset-0 flex pointer-events-none">
                <div className="w-1/3 flex items-center justify-center">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-foreground/30">
                    Кр
                  </span>
                </div>
                <div className="w-1/3 flex items-center justify-center">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-foreground/30">
                    Жл
                  </span>
                </div>
                <div className="w-1/3 flex items-center justify-center">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-foreground/30">
                    Зл
                  </span>
                </div>
              </div>

              {/* Current level indicator line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 transition-all duration-700 ease-out"
                style={{
                  left: `${fillPercent}%`,
                  background: fillColor,
                  boxShadow: `0 0 6px ${fillColor}`,
                }}
              />
            </div>

            {/* Stock info row */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-mono font-bold text-foreground tabular-nums">
                  {node.bufferCurrent}
                </span>
                <span className="text-xs text-muted-foreground">
                  {' '}
                  / {node.bufferMax}
                </span>
              </div>

              {pendingOrders.length > 0 && (
                <div className="flex items-center gap-1 text-primary rounded-full px-2 py-0.5 bg-secondary">
                  <Package className="w-3 h-3" />
                  <span className="text-[10px] font-medium tabular-nums">
                    +{pendingOrders.reduce((s, o) => s + o.quantity, 0)} в пути
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
