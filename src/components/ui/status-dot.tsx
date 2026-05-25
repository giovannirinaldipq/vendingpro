import { cn } from '@/lib/utils';

/**
 * StatusDot — linguagem visual oficial de "máquina viva".
 *
 * Spec do redesign v2:
 *  - online:      bolinha 6px amber + animação pulse infinita (2s)
 *  - offline:     bolinha 6px text-tertiary, estática
 *  - maintenance: bolinha 6px amber, border dashed, sem pulse
 *
 * NÃO usar ícones (check/X) ou texto (ON/OFF). A bolinha é a linguagem.
 */

type Status = 'online' | 'offline' | 'maintenance' | 'installing';

interface StatusDotProps {
  status: Status;
  /** Mostra rótulo textual ao lado (opcional) */
  label?: boolean;
  className?: string;
}

const LABELS: Record<Status, string> = {
  online: 'Online',
  offline: 'Offline',
  maintenance: 'Manutenção',
  installing: 'Instalando',
};

export function StatusDot({ status, label, className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 align-middle', className)}>
      <span className="relative inline-flex h-1.5 w-1.5">
        {status === 'online' && (
          <>
            {/* Pulso amber animado */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-brand-amber animate-machine-pulse"
            />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-amber" />
          </>
        )}
        {status === 'offline' && (
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-text-tertiary" />
        )}
        {status === 'maintenance' && (
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full border border-dashed border-brand-amber" />
        )}
        {status === 'installing' && (
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full border border-dashed border-brand-navy" />
        )}
      </span>
      {label && (
        <span className={cn(
          'text-xs font-medium',
          status === 'online' && 'text-text-primary',
          status === 'offline' && 'text-text-tertiary',
          status === 'maintenance' && 'text-[#92400e] dark:text-brand-amber',
          status === 'installing' && 'text-brand-navy'
        )}>
          {LABELS[status]}
        </span>
      )}
    </span>
  );
}

/**
 * Helper: mapeia status do DB (active/inactive/maintenance/installing/deactivated)
 * para o status visual.
 */
export function machineDbStatusToDot(
  status: string | null | undefined
): Status {
  if (status === 'active') return 'online';
  if (status === 'maintenance') return 'maintenance';
  if (status === 'installing') return 'installing';
  return 'offline'; // inactive, deactivated, null
}
