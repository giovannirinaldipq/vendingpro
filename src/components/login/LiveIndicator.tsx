'use client';

/**
 * LiveIndicator — bolinha amber pulsante + duas estatísticas.
 *
 * Hardcoded por enquanto (não temos endpoint /api/public/stats agregado);
 * trocar quando esse endpoint existir.
 */
export function LiveIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center">
        {/* Pulse ring expandindo */}
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"
          style={{ animation: 'live-pulse 2s ease-in-out infinite' }}
        />
        {/* Core sólido amber */}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400"
          style={{ boxShadow: '0 0 8px 2px rgba(251, 191, 36, 0.45)' }}
        />
      </span>
      <span className="font-mono text-white tabular-nums">1.247 máquinas online</span>
      <span className="text-[#475569]">·</span>
      <span className="font-mono text-[#94a3b8] tabular-nums">23 franqueados ativos</span>

      <style>{`
        @keyframes live-pulse {
          0%   { transform: scale(1); opacity: 0.6; }
          50%  { transform: scale(2.2); opacity: 0.2; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
