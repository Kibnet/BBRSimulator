'use client';

import { useSimulator } from './useSimulator';
import { NodeCard } from './NodeCard';
import { EventLog } from './EventLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Info,
  ChevronRight,
} from 'lucide-react';

export function Simulator() {
  const { state, toggleRunning, reset, setSpeed } = useSimulator();

  const supplier = state.nodes.find((n) => n.type === 'supplier')!;
  const warehouse = state.nodes.find((n) => n.type === 'warehouse')!;
  const retailers = state.nodes.filter((n) => n.type === 'retail');

  const serviceLevel =
    state.stats.totalDemand > 0
      ? ((state.stats.totalFulfilled / state.stats.totalDemand) * 100).toFixed(1)
      : '100.0';

  const ordersToWarehouse = state.orders.filter(
    (o) => o.toId === 'warehouse'
  ).length;
  const ordersFromWarehouse = state.orders.filter(
    (o) => o.fromId === 'warehouse'
  ).length;

  const speeds = [
    { label: '0.5×', value: 1600 },
    { label: '1×', value: 800 },
    { label: '2×', value: 400 },
    { label: '5×', value: 160 },
  ];

  return (
    <div className="min-h-screen bg-background bg-dot-grid">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8">
        {/* ── Header ── */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Барабан–Буфер–Канат
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Симулятор управления запасами · Теория ограничений
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Day counter */}
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2.5">
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                День
              </span>
              <span className="text-foreground font-mono text-xl font-bold tabular-nums min-w-[3ch] text-right">
                {state.day}
              </span>
            </div>

            {/* Speed selector */}
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

            {/* Play / Pause */}
            <Button
              onClick={toggleRunning}
              variant={state.isRunning ? 'destructive' : 'default'}
              className="min-w-[100px]"
            >
              {state.isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Пауза
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Старт
                </>
              )}
            </Button>

            {/* Reset */}
            <Button onClick={reset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Сброс
            </Button>
          </div>
        </header>

        {/* ── Supply Chain Visualization ── */}
        <section className="mb-8">
          <div className="flex flex-col lg:flex-row items-stretch gap-4">
            {/* Supplier */}
            <div className="lg:w-52 flex-shrink-0">
              <NodeCard node={supplier} orders={state.orders} />
            </div>

            {/* Connection: Supplier → Warehouse */}
            <ConnectionArrow
              label={`${warehouse.leadTime} дн.`}
              activeCount={ordersToWarehouse}
            />

            {/* Warehouse */}
            <div className="lg:w-72 flex-shrink-0">
              <NodeCard node={warehouse} orders={state.orders} />
            </div>

            {/* Connection: Warehouse → Retail */}
            <ConnectionArrow
              label="2–3 дн."
              activeCount={ordersFromWarehouse}
            />

            {/* Retailers */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {retailers.map((r) => (
                <NodeCard key={r.id} node={r} orders={state.orders} />
              ))}
            </div>
          </div>

          {/* Mobile flow indicators */}
          <div className="flex lg:hidden items-center justify-center gap-1 py-2 text-muted-foreground">
            <span className="text-xs">Поставщик</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-xs">Склад</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-xs">Магазины</span>
          </div>
        </section>

        {/* ── Bottom: Stats + Legend + Log ── */}
        <section className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* Left: Stats & Legend */}
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
                <StatRow label="Всего спрос" value={`${state.stats.totalDemand} ед.`} />
                <StatRow label="Отгружено" value={`${state.stats.totalFulfilled} ед.`} />
                <StatRow
                  label="Случаи дефицита"
                  value={String(state.stats.stockouts)}
                  danger={state.stats.stockouts > 0}
                />
                <StatRow
                  label="Заказов размещено"
                  value={String(state.stats.ordersPlaced)}
                />
                <StatRow
                  label="В пути"
                  value={String(state.orders.length)}
                  primary={state.orders.length > 0}
                />
              </CardContent>
            </Card>

            {/* Buffer zone legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Зоны буфера
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <LegendItem
                  color="hsl(142 71% 45%)"
                  label="Зелёная зона"
                  desc="67–100% — запас достаточен"
                />
                <LegendItem
                  color="hsl(45 93% 47%)"
                  label="Жёлтая зона"
                  desc="33–67% — заказ на пополнение"
                />
                <LegendItem
                  color="hsl(0 72% 51%)"
                  label="Красная зона"
                  desc="0–33% — срочное пополнение"
                />
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <strong className="text-primary">Канат (Rope)</strong> — сигнал
                    от потребления к поставщику. Заказ размещается при входе в
                    жёлтую или красную зону на количество до полного буфера.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Event Log */}
          <EventLog log={state.log} />
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ConnectionArrow({
  label,
  activeCount,
}: {
  label: string;
  activeCount: number;
}) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center w-20 flex-shrink-0 gap-1">
      <div className="relative flex items-center">
        <div
          className={`w-12 h-px transition-colors duration-300 ${
            activeCount > 0 ? 'bg-primary' : 'bg-border'
          }`}
        />
        <ArrowRight
          className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${
            activeCount > 0 ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        {activeCount > 0 && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="text-[9px] font-mono font-bold text-primary bg-secondary rounded-full px-1.5 py-0.5 animate-pulse-glow">
              {activeCount}
            </span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
        {label}
      </span>
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

function LegendItem({
  color,
  label,
  desc,
}: {
  color: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <span className="text-xs font-medium text-foreground">{label}</span>
        <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
      </div>
    </div>
  );
}
