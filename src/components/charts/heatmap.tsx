'use client';

import { useMemo } from 'react';

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
}

interface HeatmapProps {
  data: HeatmapData[];
  maxValue?: number;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Heatmap usando escala de calor brand-amber, theme-aware:
 * - célula vazia: surface-subtle
 * - intensidade cresce com opacity sobre amber → permanece legível em light & dark
 */
function intensityStyle(value: number, max: number): { className: string; style?: React.CSSProperties } {
  if (value === 0) {
    return { className: 'bg-surface-subtle' };
  }
  const intensity = Math.min(1, value / max);
  // Stops discretos pra cair em 5 níveis e não ficar gradient demais
  const stops = [0.15, 0.35, 0.55, 0.75, 1.0];
  const opacity = stops.find(s => intensity <= s) ?? 1.0;
  return {
    className: '',
    style: { backgroundColor: `rgb(251 191 36 / ${opacity})` }, // brand-amber-400
  };
}

export function Heatmap({ data, maxValue }: HeatmapProps) {
  const { grid, max } = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = maxValue || 0;

    data.forEach(({ hour, day, value }) => {
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        grid[day][hour] = value;
        if (!maxValue && value > max) max = value;
      }
    });

    return { grid, max: max || 1 };
  }, [data, maxValue]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header - Hours */}
        <div className="flex">
          <div className="w-12 shrink-0" />
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-1 text-center text-[10px] text-text-tertiary tabular-nums"
            >
              {hour}h
            </div>
          ))}
        </div>

        {/* Grid */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center">
            <div className="w-12 shrink-0 text-xs font-medium text-text-tertiary">
              {day}
            </div>
            {HOURS.map((hour) => {
              const value = grid[dayIndex][hour];
              const { className, style } = intensityStyle(value, max);
              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className={`flex-1 aspect-square m-0.5 rounded-sm transition-all cursor-pointer hover:ring-2 hover:ring-brand-navy hover:ring-offset-1 hover:ring-offset-surface-card ${className}`}
                  style={style}
                  title={`${day} ${hour}h: ${value} vendas`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-text-tertiary">
          <span>Menos</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-surface-subtle" />
            {[0.15, 0.35, 0.55, 0.75, 1.0].map(op => (
              <div key={op} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgb(251 191 36 / ${op})` }} />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
