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

function getColor(value: number, max: number): string {
  if (value === 0) return 'bg-gray-100';
  const intensity = value / max;
  if (intensity < 0.2) return 'bg-green-100';
  if (intensity < 0.4) return 'bg-green-200';
  if (intensity < 0.6) return 'bg-green-400';
  if (intensity < 0.8) return 'bg-green-500';
  return 'bg-green-600';
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
              className="flex-1 text-center text-xs text-muted-foreground"
            >
              {hour}h
            </div>
          ))}
        </div>

        {/* Grid */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center">
            <div className="w-12 shrink-0 text-xs font-medium text-muted-foreground">
              {day}
            </div>
            {HOURS.map((hour) => {
              const value = grid[dayIndex][hour];
              return (
                <div
                  key={`${dayIndex}-${hour}`}
                  className={`flex-1 aspect-square m-0.5 rounded-sm ${getColor(value, max)} transition-colors cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1`}
                  title={`${day} ${hour}h: ${value} vendas`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded-sm bg-gray-100" />
            <div className="w-4 h-4 rounded-sm bg-green-100" />
            <div className="w-4 h-4 rounded-sm bg-green-200" />
            <div className="w-4 h-4 rounded-sm bg-green-400" />
            <div className="w-4 h-4 rounded-sm bg-green-500" />
            <div className="w-4 h-4 rounded-sm bg-green-600" />
          </div>
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
