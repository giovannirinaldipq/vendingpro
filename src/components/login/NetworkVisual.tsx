'use client';

import { useEffect, useState } from 'react';

/**
 * NetworkVisual — SVG ~300x180 com 5 mini-grids 3x3 ligados por linhas
 * tracejadas, simulando uma rede de máquinas em tempo real.
 *
 * 3 grids ACTIVE (mesmo padrão da logo: cantos topo + centro em amber,
 * outras células white/0.2). 2 grids DIMMED (todas em white/0.18-0.4).
 *
 * Animação sutil: a cada ~3s uma célula amber aleatória de algum grid
 * active pulsa (scale 1 → 1.2 → 1, 600ms). Não distrativo.
 */

interface Grid {
  cx: number;
  cy: number;
  active: boolean;
}

// Padrão de grid 3x3 (cells 8x8, gap 4)
const CELL_SIZE = 8;
const GAP = 4;
const GRID_DIM = CELL_SIZE * 3 + GAP * 2; // 32

// 5 grids em padrão de constelação dentro de viewBox 300x180
const GRIDS: Grid[] = [
  { cx: 50,  cy: 35,  active: true  },  // top-left
  { cx: 240, cy: 30,  active: true  },  // top-right
  { cx: 145, cy: 80,  active: true  },  // center (hub)
  { cx: 60,  cy: 140, active: false },  // bottom-left dim
  { cx: 230, cy: 145, active: false },  // bottom-right dim
];

// Linhas conectando o hub central aos demais (efeito network)
const EDGES: Array<[number, number]> = [
  [0, 2], [2, 1], [2, 3], [2, 4],
  [0, 3], [1, 4],
];

// Padrão amber da logo (cantos do topo + centro)
const AMBER_CELLS = new Set([0, 2, 4]);

export function NetworkVisual() {
  // Pulse aleatório a cada 3s — escolhe (gridIdx, cellIdx)
  const [pulse, setPulse] = useState<{ g: number; c: number; t: number }>({ g: 2, c: 0, t: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      const activeGrids = GRIDS.map((g, i) => g.active ? i : -1).filter(i => i >= 0);
      const g = activeGrids[Math.floor(Math.random() * activeGrids.length)];
      const cells = [...AMBER_CELLS];
      const c = cells[Math.floor(Math.random() * cells.length)];
      setPulse({ g, c, t: Date.now() });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <svg
      viewBox="0 0 300 180"
      width="100%"
      className="max-w-[320px]"
      aria-hidden
    >
      {/* Linhas de conexão tracejadas amber */}
      {EDGES.map(([a, b], i) => {
        const ga = GRIDS[a];
        const gb = GRIDS[b];
        return (
          <line
            key={`e-${i}`}
            x1={ga.cx}
            y1={ga.cy}
            x2={gb.cx}
            y2={gb.cy}
            stroke="#fbbf24"
            strokeWidth={0.6}
            strokeOpacity={0.35}
            strokeDasharray="2,3"
          />
        );
      })}

      {/* Grids 3x3 */}
      {GRIDS.map((grid, gi) => (
        <g key={`g-${gi}`} transform={`translate(${grid.cx - GRID_DIM / 2}, ${grid.cy - GRID_DIM / 2})`}>
          {Array.from({ length: 9 }).map((_, ci) => {
            const row = Math.floor(ci / 3);
            const col = ci % 3;
            const x = col * (CELL_SIZE + GAP);
            const y = row * (CELL_SIZE + GAP);

            let fill: string;
            let opacity: number;

            if (grid.active) {
              if (AMBER_CELLS.has(ci)) {
                fill = '#fbbf24';
                opacity = 1;
              } else {
                fill = '#ffffff';
                opacity = 0.2;
              }
            } else {
              fill = '#ffffff';
              opacity = ci % 2 === 0 ? 0.28 : 0.18;
            }

            const isPulsing = pulse.g === gi && pulse.c === ci;

            return (
              <rect
                key={ci}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={1.5}
                fill={fill}
                fillOpacity={opacity}
                style={isPulsing ? {
                  animation: 'cell-pulse 600ms ease-out',
                  transformOrigin: `${x + CELL_SIZE / 2}px ${y + CELL_SIZE / 2}px`,
                  transformBox: 'fill-box',
                } : undefined}
              />
            );
          })}
        </g>
      ))}

      <style>{`
        @keyframes cell-pulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </svg>
  );
}
