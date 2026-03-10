'use client';

import type { LogEntry } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

interface EventLogProps {
  log: LogEntry[];
}

const typeColorMap: Record<LogEntry['type'], string> = {
  consumption: 'text-secondary-foreground',
  delivery: 'text-foreground',
  order: 'text-primary',
  warning: 'text-destructive',
  info: 'text-muted-foreground',
};

export function EventLog({ log }: EventLogProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          Журнал событий
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] overflow-y-auto space-y-0.5 scrollbar-thin pr-2">
          {log.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-12">
              Нажмите «Старт» для начала симуляции
            </p>
          ) : (
            log.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-start gap-2.5 text-xs py-1 animate-fade-in-up ${typeColorMap[entry.type]}`}
              >
                <span className="text-muted-foreground font-mono tabular-nums flex-shrink-0 w-10 text-right">
                  {entry.day}
                </span>
                <span className="leading-relaxed">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
