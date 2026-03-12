'use client';

import type { CustomerOrder, Machine } from './types';
import { getOrderZone, ZONE_COLORS, ZONE_BG, ZONE_BORDER } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface GanttChartProps {
  currentDay: number;
  machines: Machine[];
  orders: CustomerOrder[];
  daysToShow?: number;
}

export function GanttChart({ currentDay, machines, orders, daysToShow = 20 }: GanttChartProps) {
  const drumMachines = machines.filter((m) => m.operationId === 2);
  const startDay = currentDay;
  const endDay = currentDay + daysToShow;
  const days = Array.from({ length: daysToShow }, (_, i) => startDay + i);

  // Build drum schedule: current order + estimated queue
  const drumSchedule = drumMachines.map((machine) => {
    const bars: { order: CustomerOrder; startDay: number; endDay: number }[] = [];
    const currentOrder = machine.currentOrderId
      ? orders.find((o) => o.id === machine.currentOrderId)
      : null;

    if (currentOrder && currentOrder.processingRemaining > 0) {
      bars.push({
        order: currentOrder,
        startDay: currentDay,
        endDay: currentDay + currentOrder.processingRemaining,
      });
    }

    // Estimate next orders from WIP1 queue (sorted by priority)
    const wip1Orders = orders
      .filter((o) => o.status === 'wip1')
      .sort((a, b) => {
        const pA = (currentDay - a.createdDay) / a.bufferDays;
        const pB = (currentDay - b.createdDay) / b.bufferDays;
        return pB - pA;
      });

    let nextStart = bars.length > 0 ? bars[bars.length - 1].endDay : currentDay;
    // Distribute wip1 orders round-robin across drum machines roughly
    const machineIdx = drumMachines.indexOf(machine);
    for (let i = machineIdx; i < wip1Orders.length; i += drumMachines.length) {
      const o = wip1Orders[i];
      const dur = Math.max(1, Math.ceil(o.quantity / machine.capacity));
      if (nextStart >= endDay) break;
      bars.push({ order: o, startDay: nextStart, endDay: nextStart + dur });
      nextStart += dur;
    }

    return { machine, bars };
  });

  // Shipment deadlines: all active non-shipped orders
  const shipments = orders
    .filter((o) => o.status !== 'shipped' && o.dueDay >= startDay && o.dueDay <= endDay)
    .sort((a, b) => a.dueDay - b.dueDay);

  // Group shipments by day
  const shipmentsByDay: Record<number, CustomerOrder[]> = {};
  for (const o of shipments) {
    if (!shipmentsByDay[o.dueDay]) shipmentsByDay[o.dueDay] = [];
    shipmentsByDay[o.dueDay].push(o);
  }

  const cellWidth = 100 / daysToShow;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Расписание барабана и отгрузок
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Day headers */}
            <div className="flex border-b border-border mb-1">
              <div className="w-24 flex-shrink-0" />
              <div className="flex-1 flex">
                {days.map((d) => (
                  <div
                    key={d}
                    className={`text-center text-[9px] font-mono tabular-nums py-1 ${
                      d === currentDay
                        ? 'text-primary font-bold'
                        : d % 5 === 0
                        ? 'text-secondary-foreground'
                        : 'text-muted-foreground/50'
                    }`}
                    style={{ width: `${cellWidth}%` }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Drum machine rows */}
            {drumSchedule.map(({ machine, bars }) => (
              <div key={machine.id} className="flex items-center mb-1 min-h-[28px]">
                <div className="w-24 flex-shrink-0 pr-2">
                  <span className="text-[10px] text-secondary-foreground truncate block">
                    {machine.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {machine.capacity} ед/дн
                  </span>
                </div>
                <div className="flex-1 relative h-6 bg-muted/30 rounded">
                  {/* Today marker */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary/40 z-10"
                    style={{ left: '0%' }}
                  />
                  {bars.map(({ order, startDay: bs, endDay: be }) => {
                    const left = Math.max(0, ((bs - startDay) / daysToShow) * 100);
                    const width = Math.min(
                      100 - left,
                      ((be - bs) / daysToShow) * 100
                    );
                    if (width <= 0) return null;
                    const zone = getOrderZone(order, currentDay);
                    return (
                      <div
                        key={order.id}
                        className="absolute top-0.5 bottom-0.5 rounded-sm flex items-center justify-center overflow-hidden border"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: ZONE_BG[zone],
                          borderColor: ZONE_BORDER[zone],
                        }}
                        title={`${order.number}: ${order.quantity} ед., отгрузка день ${order.dueDay}`}
                      >
                        <span
                          className="text-[8px] font-mono font-bold truncate px-0.5"
                          style={{ color: ZONE_COLORS[zone] }}
                        >
                          {order.number}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Shipment timeline row */}
            <div className="flex items-center mt-2 pt-2 border-t border-border min-h-[28px]">
              <div className="w-24 flex-shrink-0 pr-2">
                <span className="text-[10px] text-secondary-foreground">Отгрузки</span>
              </div>
              <div className="flex-1 relative h-6">
                {days.map((d) => {
                  const dayShipments = shipmentsByDay[d];
                  if (!dayShipments) return null;
                  const left = ((d - startDay) / daysToShow) * 100;
                  // Show the highest-priority (most penetrated) zone color
                  const worstZone = dayShipments.reduce((worst, o) => {
                    const z = getOrderZone(o, currentDay);
                    const priority = { green: 0, yellow: 1, red: 2, black: 3 };
                    return priority[z] > priority[worst] ? z : worst;
                  }, 'green' as 'green' | 'yellow' | 'red' | 'black');

                  return (
                    <div
                      key={d}
                      className="absolute top-0 flex flex-col items-center"
                      style={{ left: `${left}%` }}
                      title={dayShipments.map((o) => `${o.number} (${o.quantity} ед.)`).join(', ')}
                    >
                      <div
                        className="w-3 h-3 rotate-45 rounded-sm border"
                        style={{
                          background: ZONE_BG[worstZone],
                          borderColor: ZONE_COLORS[worstZone],
                        }}
                      />
                      <span className="text-[8px] font-mono text-muted-foreground mt-0.5">
                        {dayShipments.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
