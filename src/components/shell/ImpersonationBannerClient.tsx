'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  tenantName: string;
  contactName: string;
  expiresAt: string;
}

export function ImpersonationBannerClient({ tenantName, contactName, expiresAt }: Props) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    function tick() {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft('expirado');
        return;
      }
      const mins = Math.floor(ms / 60000);
      const hrs = Math.floor(mins / 60);
      setTimeLeft(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`);
    }
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [expiresAt]);

  async function endImpersonation() {
    setEnding(true);
    try {
      const res = await fetch('/api/admin/impersonate/end', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        toast.success('Você voltou para o backoffice');
        router.push(json.data?.redirect_to ?? '/admin');
        router.refresh();
      } else {
        toast.error('Erro ao encerrar impersonação');
        setEnding(false);
      }
    } catch {
      toast.error('Erro ao encerrar impersonação');
      setEnding(false);
    }
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-amber-300 px-4 py-2 text-sm lg:px-8"
      style={{ background: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)', color: '#78350f' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Eye className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="truncate">
          Visualizando como{' '}
          <strong className="font-semibold">{tenantName}</strong>
          <span className="hidden sm:inline text-amber-700/80"> · {contactName}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-700/80">
          <Clock className="h-3 w-3" strokeWidth={2.2} />
          {timeLeft}
        </span>
        <button
          onClick={endImpersonation}
          disabled={ending}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-2.5 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-950 disabled:opacity-60"
        >
          <LogOut className="h-3 w-3" strokeWidth={2.5} />
          {ending ? 'Encerrando…' : 'Encerrar'}
        </button>
      </div>
    </div>
  );
}
