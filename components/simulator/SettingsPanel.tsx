'use client';

import { useState } from 'react';
import type { SimConfig, RetailerConfig } from './types';
import { DEFAULT_CONFIG, PROFILES } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Check, X, Factory, Warehouse, Store, Zap } from 'lucide-react';

interface SettingsPanelProps {
  currentConfig: SimConfig;
  isRunning: boolean;
  onApply: (config: SimConfig) => void;
  onClose: () => void;
}

/* ── Labeled numeric input ── */
function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs text-muted-foreground whitespace-nowrap">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          className="w-20 h-8 rounded-md border border-input bg-secondary px-2 text-sm font-mono text-foreground text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {unit && (
          <span className="text-[10px] text-muted-foreground w-10">{unit}</span>
        )}
      </div>
    </div>
  );
}

export function SettingsPanel({ currentConfig, isRunning, onApply, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<SimConfig>(() => JSON.parse(JSON.stringify(currentConfig)));

  const updateSupplier = (key: keyof SimConfig['supplier'], value: number) => {
    setConfig((prev) => ({
      ...prev,
      supplier: { ...prev.supplier, [key]: value },
    }));
  };

  const updateWarehouse = (key: keyof SimConfig['warehouse'], value: number) => {
    setConfig((prev) => ({
      ...prev,
      warehouse: { ...prev.warehouse, [key]: value },
    }));
  };

  const updateRetailer = (idx: number, key: keyof RetailerConfig, value: number | string) => {
    setConfig((prev) => {
      const retailers = [...prev.retailers];
      retailers[idx] = { ...retailers[idx], [key]: value };
      return { ...prev, retailers };
    });
  };

  const handleReset = () => {
    setConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  };

  const handleApply = () => {
    onApply(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin mx-4 animate-fade-in-up">
        <Card className="border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Параметры симуляции
              </CardTitle>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isRunning && (
              <p className="text-[11px] text-destructive mt-1">
                Симуляция будет перезапущена при применении изменений
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-5">
            {/* ── Profiles ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-medium text-foreground">Профиль запуска</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                {PROFILES.map((profile) => {
                  const isActive =
                    JSON.stringify(config) === JSON.stringify(profile.config);
                  return (
                    <button
                      key={profile.id}
                      onClick={() =>
                        setConfig(JSON.parse(JSON.stringify(profile.config)))
                      }
                      className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                        isActive
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border bg-secondary/50 hover:border-primary/30 hover:bg-secondary'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium block ${
                          isActive ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {profile.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                        {profile.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ── Supplier ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center">
                  <Factory className="w-3.5 h-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-medium text-foreground">Производство</h4>
              </div>
              <div className="space-y-2.5 pl-8">
                <NumField
                  label="Цикл производства"
                  value={config.supplier.productionLeadTime}
                  onChange={(v) => updateSupplier('productionLeadTime', v)}
                  min={1}
                  max={30}
                  unit="дн."
                />
                <NumField
                  label="Мощность"
                  value={config.supplier.productionCapacity}
                  onChange={(v) => updateSupplier('productionCapacity', v)}
                  min={1}
                  max={500}
                  unit="ед./дн."
                />
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ── Warehouse ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center">
                  <Warehouse className="w-3.5 h-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-medium text-foreground">Центральный склад</h4>
              </div>
              <div className="space-y-2.5 pl-8">
                <NumField
                  label="Размер буфера"
                  value={config.warehouse.bufferMax}
                  onChange={(v) => updateWarehouse('bufferMax', v)}
                  min={10}
                  max={2000}
                  unit="ед."
                />
                <NumField
                  label="Время доставки"
                  value={config.warehouse.leadTime}
                  onChange={(v) => updateWarehouse('leadTime', v)}
                  min={1}
                  max={30}
                  unit="дн."
                />
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ── Retailers ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center">
                  <Store className="w-3.5 h-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-medium text-foreground">Магазины</h4>
              </div>
              <div className="space-y-4">
                {config.retailers.map((retailer, idx) => (
                  <div key={retailer.id} className="pl-8">
                    <p className="text-xs font-medium text-secondary-foreground mb-2">
                      {retailer.name}
                    </p>
                    <div className="space-y-2 pl-2 border-l-2 border-border">
                      <div className="pl-3 space-y-2">
                        <NumField
                          label="Буфер"
                          value={retailer.bufferMax}
                          onChange={(v) => updateRetailer(idx, 'bufferMax', v)}
                          min={5}
                          max={500}
                          unit="ед."
                        />
                        <NumField
                          label="Средний спрос"
                          value={retailer.avgDemand}
                          onChange={(v) => updateRetailer(idx, 'avgDemand', v)}
                          min={1}
                          max={100}
                          unit="ед./дн."
                        />
                        <NumField
                          label="Разброс (σ)"
                          value={retailer.demandStdev}
                          onChange={(v) => updateRetailer(idx, 'demandStdev', v)}
                          min={0}
                          max={50}
                          step={0.5}
                          unit="ед."
                        />
                        <NumField
                          label="Время доставки"
                          value={retailer.leadTime}
                          onChange={(v) => updateRetailer(idx, 'leadTime', v)}
                          min={1}
                          max={14}
                          unit="дн."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Actions ── */}
            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Button onClick={handleApply} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Применить
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" />
                По умолчанию
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
