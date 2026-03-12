'use client';

import { useState } from 'react';
import { useProductionSim } from './useProductionSim';
import { MachineCard } from './MachineCard';
import { OrderBadge } from './OrderBadge';
import { ProdEventLog } from './ProdEventLog';
import { ProdSettingsPanel } from './ProdSettingsPanel';
import { GanttChart } from './GanttChart';
import { BufferStatus } from './BufferStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getBufferPenetration,
  getOrderZone,
  sortByPriority,
  ZONE_COLORS,
  ZONE_BG,
  ZONE_BORDER,
} from './types';
import type { CustomerOrder, ProdConfig } from './types';
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Info,
  ArrowRight,
  Package,
  ClipboardList,
  Factory,
  Warehouse,
  Truck,
  Settings,
  Link2,
  CalendarClock,
} from 'lucide-react';
import Link from 'next/link';

const OP_NAMES: Record<number, string> = { 1: 'Заготовка', 2: 'Обработка', 3: 'Сборка' };

export function ProductionSimulator() {
  const { state, toggleRunning, reset, setSpeed, config, toggleRope, toggleDynamicDueDates } = useProductionSim();
  const [showSettings, setShowSettings] = useState(false);
  const { day, orders, machines, stats, log } = state;

  const handleApplyConfig = (newConfig: ProdConfig) => {
    reset(newConfig);
    setShowSettings(false);
  };

  // Categorize orders
  const queued = sortByPriority(
    orders.filter((o) => o.status === 'queued'),
    day
  );
  const wip1 = sortByPriority(
    orders.filter((o) => o.status === 'wip1'),
    day
  );
  const wip2 = sortByPriority(
    orders.filter((o) => o.status === 'wip2'),
    day
  );
  const finished = sortByPriority(
    orders.filter((o) => o.status === 'finished'),
    day
  );
  const shipped = orders.filter((o) => o.status === 'shipped');

  // Machines by operation
  const op1Machines = machines.filter((m) => m.operationId === 1);
  const op2Machines = machines.filter((m) => m.operationId === 2);
  const op3Machines = machines.filter((m) => m.operationId === 3);

  const serviceLevel =
    stats.totalShipped > 0
      ? ((stats.shippedOnTime / stats.totalShipped) * 100).toFixed(1)
      : '100.0';

  const speeds = [
    { label: '0.5×', value: 1600 },
    { label: '1×', value: 800 },
    { label: '2×', value: 400 },
    { label: '5×', value: 160 },
  ];

  return (
    <div className="min-h-screen bg-background bg-dot-grid">
      <div className="max-w-[1400px] mx-auto px-4 py-6 md:px-6 lg:px-8">
        {/* ── Header ── */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                ББК · Производство
              </h1>
              <Link
                href="/"
                className="text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors"
              >
                Цепочка поставок →
              </Link>
            </div>
            <p className="text-muted-foreground text-sm">
              Управление производственными заказами · Буфер времени · Приоритет по проникновению
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2.5">
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest">День</span>
              <span className="text-foreground font-mono text-xl font-bold tabular-nums min-w-[3ch] text-right">
                {day}
              </span>
            </div>

            <div className="flex items-center rounded-lg overflow-hidden border border-border">
              {speeds.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpeed(s.value)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    state.speed === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Button
              onClick={toggleRunning}
              variant={state.isRunning ? 'destructive' : 'default'}
              className="min-w-[100px]"
            >
              {state.isRunning ? (
                <><Pause className="w-4 h-4 mr-2" />Пауза</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />Старт</>
              )}
            </Button>

            <Button onClick={() => reset()} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />Сброс
            </Button>

            <Button onClick={() => setShowSettings(true)} variant="outline">
              <Settings className="w-4 h-4 mr-2" />Параметры
            </Button>

            {/* Rope toggle */}
            <button
              onClick={toggleRope}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                config.ropeEnabled
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Канат {config.ropeEnabled ? 'ВКЛ' : 'ВЫКЛ'}
              {config.ropeEnabled && (
                <span className="text-[10px] opacity-70">
                  (WIP≤{config.ropeWIPLimit})
                </span>
              )}
            </button>

            {/* Dynamic due dates toggle */}
            <button
              onClick={toggleDynamicDueDates}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                config.dynamicDueDates
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Дин. сроки {config.dynamicDueDates ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>
        </header>

        {/* ── Production Pipeline ── */}
        <section className="mb-6">
          <div className="flex flex-col xl:flex-row gap-3 items-stretch">
            {/* Order Queue */}
            <PipelineStage
              icon={<ClipboardList className="w-4 h-4 text-primary" />}
              title="Очередь заказов"
              subtitle={`${queued.length} заказов`}
              className="xl:w-48"
            >
              <OrderList orders={queued} currentDay={day} maxShow={6} />
            </PipelineStage>

            <PipelineArrow />

            {/* Op 1 */}
            <OperationColumn
              opId={1}
              name={OP_NAMES[1]}
              machines={op1Machines}
              orders={orders}
              currentDay={day}
              isDrum={false}
            />

            <WIPColumn label="П/ф 1" orders={wip1} currentDay={day} />

            {/* Op 2 — DRUM */}
            <OperationColumn
              opId={2}
              name={OP_NAMES[2]}
              machines={op2Machines}
              orders={orders}
              currentDay={day}
              isDrum={true}
            />

            <WIPColumn label="П/ф 2" orders={wip2} currentDay={day} />

            {/* Op 3 */}
            <OperationColumn
              opId={3}
              name={OP_NAMES[3]}
              machines={op3Machines}
              orders={orders}
              currentDay={day}
              isDrum={false}
            />

            <PipelineArrow />

            {/* Finished Goods */}
            <PipelineStage
              icon={<Warehouse className="w-4 h-4 text-primary" />}
              title="Склад ГП"
              subtitle={`${finished.length} заказов`}
              className="xl:w-48"
            >
              <OrderList orders={finished} currentDay={day} maxShow={6} />
            </PipelineStage>

            <PipelineArrow />

            {/* Shipped */}
            <PipelineStage
              icon={<Truck className="w-4 h-4 text-primary" />}
              title="Отгружено"
              subtitle={`${stats.totalShipped} всего`}
              className="xl:w-40"
            >
              <div className="text-center py-3">
                <span className="text-2xl font-mono font-bold text-foreground tabular-nums">
                  {stats.totalShipped}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">
                  в срок: {stats.shippedOnTime} · поздно: {stats.shippedLate}
                </p>
              </div>
            </PipelineStage>
          </div>
        </section>

        {/* ── Gantt + Buffer ── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-6">
          <GanttChart
            currentDay={day}
            machines={machines}
            orders={orders}
          />
          <BufferStatus
            orders={orders}
            currentDay={day}
            bufferSize={config.bufferSize}
          />
        </section>

        {/* ── Bottom: Stats + Legend + Log ── */}
        <section className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          <div className="space-y-4">
            {/* Statistics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Статистика
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatRow label="Уровень сервиса" value={`${serviceLevel}%`} highlight />
                <StatRow label="Всего заказов" value={String(stats.totalOrders)} />
                <StatRow label="Отгружено" value={String(stats.totalShipped)} />
                <StatRow
                  label="В срок"
                  value={String(stats.shippedOnTime)}
                  primary={stats.shippedOnTime > 0}
                />
                <StatRow
                  label="С опозданием"
                  value={String(stats.shippedLate)}
                  danger={stats.shippedLate > 0}
                />
                <StatRow label="В очереди" value={String(queued.length)} />
                <StatRow label="В производстве" value={String(
                  orders.filter((o) => ['op1','op2','op3','wip1','wip2'].includes(o.status)).length
                )} primary />
                <StatRow label="На складе ГП" value={String(finished.length)} />
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Приоритет по буферу
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <LegendItem color={ZONE_COLORS.green} label="Зелёный" desc="0–33% буфера использовано" />
                <LegendItem color={ZONE_COLORS.yellow} label="Жёлтый" desc="33–67% — требует внимания" />
                <LegendItem color={ZONE_COLORS.red} label="Красный" desc="67–100% — срочный приоритет" />
                <LegendItem color={ZONE_COLORS.black} label="Чёрный" desc=">100% — просрочен" />
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <strong className="text-primary">Барабан</strong> — операция «Обработка»
                    (наименьшая мощность). Определяет темп всей системы.
                    Заказы с наибольшим проникновением в буфер обрабатываются первыми.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <ProdEventLog log={log} />
        </section>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <ProdSettingsPanel
          currentConfig={config}
          isRunning={state.isRunning}
          onApply={handleApplyConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

function PipelineStage({
  icon,
  title,
  subtitle,
  children,
  className = '',
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex-shrink-0 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground leading-tight">{title}</h3>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function OperationColumn({
  opId,
  name,
  machines,
  orders,
  currentDay,
  isDrum,
}: {
  opId: number;
  name: string;
  machines: typeof import('./types').DEFAULT_MACHINES;
  orders: CustomerOrder[];
  currentDay: number;
  isDrum: boolean;
}) {
  const totalIdleDays = machines.reduce((s, m) => s + m.idleDays, 0);
  const avgBusyPct = currentDay > 0
    ? ((currentDay * machines.length - totalIdleDays) / (currentDay * machines.length)) * 100
    : 0;

  return (
    <Card className={`flex-1 min-w-0 ${isDrum ? 'border-destructive/30 glow-red' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
            isDrum ? 'bg-destructive/15' : 'bg-secondary'
          }`}>
            <Factory className={`w-4 h-4 ${isDrum ? 'text-destructive' : 'text-primary'}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-foreground leading-tight">
                Оп. {opId}: {name}
              </h3>
              {isDrum && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5">
                  Барабан
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {machines.length} ед. оборуд. · Σ {machines.reduce((s, m) => s + m.capacity, 0)} ед/дн
              {currentDay > 0 && (
                <span className={`ml-1.5 font-mono ${avgBusyPct > 80 ? 'text-green-500' : avgBusyPct > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  · загр. {Math.round(avgBusyPct)}%
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {machines.map((machine) => {
            const order = machine.currentOrderId
              ? orders.find((o) => o.id === machine.currentOrderId) ?? null
              : null;
            return (
              <MachineCard
                key={machine.id}
                machine={machine}
                order={order}
                currentDay={currentDay}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WIPColumn({ label, orders: wipOrders, currentDay }: {
  label: string;
  orders: CustomerOrder[];
  currentDay: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center xl:w-16 flex-shrink-0 gap-1">
      <div className="hidden xl:flex flex-col items-center gap-1">
        <div className="w-px h-4 bg-border" />
        <div className="bg-secondary rounded-md px-1.5 py-1 text-center">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">{label}</span>
          <span className="text-xs font-mono font-bold text-foreground tabular-nums">{wipOrders.length}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
      </div>
      {/* Mobile: show as inline */}
      <div className="xl:hidden flex items-center gap-1 py-1">
        <span className="text-[10px] text-muted-foreground">{label}:</span>
        <span className="text-xs font-mono font-bold text-foreground">{wipOrders.length}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="hidden xl:flex items-center justify-center w-6 flex-shrink-0">
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function OrderList({ orders, currentDay, maxShow }: {
  orders: CustomerOrder[];
  currentDay: number;
  maxShow: number;
}) {
  const visible = orders.slice(0, maxShow);
  const remaining = orders.length - maxShow;

  return (
    <div className="space-y-1.5">
      {visible.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/60 text-center py-2 italic">пусто</p>
      ) : (
        visible.map((order) => (
          <OrderBadge key={order.id} order={order} currentDay={currentDay} compact />
        ))
      )}
      {remaining > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          +{remaining} ещё
        </p>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
  danger,
  primary,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${
          danger
            ? 'text-destructive'
            : primary
            ? 'text-primary'
            : highlight
            ? 'text-foreground'
            : 'text-secondary-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function LegendItem({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0" style={{ backgroundColor: color }} />
      <div>
        <span className="text-xs font-medium text-foreground">{label}</span>
        <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
      </div>
    </div>
  );
}
