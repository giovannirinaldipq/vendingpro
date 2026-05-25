'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, X, MapPin, Monitor, Package, FileSpreadsheet, ArrowRight, Sparkles } from 'lucide-react';

interface OnboardingStatus {
  locations: number;
  machines: number;
  products: number;
  sales: number;
}

const DISMISS_KEY = 'vp_onboarding_dismissed';

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
      return;
    }
    fetch('/api/app/onboarding-status').then(r => r.json()).then(j => setStatus(j.data));
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (dismissed || !status) return null;

  const allDone = status.locations > 0 && status.machines > 0 && status.products > 0 && status.sales > 0;
  if (allDone) return null;

  const steps = [
    { done: status.locations > 0, label: 'Cadastrar primeiro local',  href: '/app/locais/novo',    icon: MapPin },
    { done: status.machines  > 0, label: 'Adicionar primeira máquina', href: '/app/maquinas/nova',  icon: Monitor },
    { done: status.products  > 0, label: 'Cadastrar produtos',         href: '/app/produtos/novo',  icon: Package },
    { done: status.sales     > 0, label: 'Importar planilha do VM PAY',href: '/app/importar',       icon: FileSpreadsheet },
  ];
  const completed = steps.filter(s => s.done).length;
  const progressPercent = (completed / steps.length) * 100;
  // Só permite dismiss depois de cumprir os 2 primeiros (local + máquina);
  // antes disso o app fica inútil e não faz sentido esconder o guia.
  const canDismiss = completed >= 2;

  return (
    <Card className="border-brand-amber/30 bg-brand-amber/[0.04] mb-6 relative overflow-hidden">
      {/* Decoração: gridzinho amber sutil no canto, eco da identidade */}
      <svg
        aria-hidden
        viewBox="0 0 36 36"
        className="absolute right-4 top-4 h-9 w-9 opacity-40 pointer-events-none"
      >
        {[
          [1, 0.18, 1],
          [0.18, 1, 0.18],
          [0.18, 0.18, 0.18],
        ].map((row, ri) =>
          row.map((alpha, ci) => (
            <rect
              key={`${ri}-${ci}`}
              x={ci * 13} y={ri * 13}
              width={10} height={10} rx={2}
              fill="#fbbf24"
              fillOpacity={alpha === 1 ? 0.5 : 0.15}
            />
          ))
        )}
      </svg>

      <CardHeader className="flex flex-row items-start justify-between space-y-0 relative pr-14">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-brand-amber" strokeWidth={2} />
            <CardTitle className="text-base">Bem-vindo à VendingPro</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Complete os primeiros passos pra começar
            (<span className="tabular-nums font-medium text-text-primary">{completed}/{steps.length}</span>)
          </CardDescription>
          {/* Progress amber */}
          <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-full bg-brand-amber transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {canDismiss ? (
          <button
            onClick={dismiss}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Dispensar onboarding"
            title="Dispensar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span
            className="text-[10px] uppercase tracking-wider text-brand-amber font-bold"
            title="Termine pelo menos local + máquina para continuar"
          >
            Setup
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {steps.map(s => (
            <Link key={s.href} href={s.done ? '#' : s.href}>
              <div className={`group flex items-center gap-3 p-2 rounded-md transition-colors ${
                s.done
                  ? 'text-text-tertiary'
                  : 'hover:bg-surface-card cursor-pointer'
              }`}>
                {s.done
                  ? <CheckCircle2 className="h-4 w-4 text-brand-amber shrink-0" strokeWidth={2} />
                  : <Circle className="h-4 w-4 text-text-tertiary shrink-0" strokeWidth={1.5} />}
                <s.icon className={`h-4 w-4 shrink-0 ${s.done ? 'text-text-tertiary' : 'text-brand-navy'}`} strokeWidth={1.75} />
                <span className={`flex-1 text-sm ${s.done ? 'line-through' : 'font-medium text-text-primary'}`}>
                  {s.label}
                </span>
                {!s.done && (
                  <ArrowRight className="h-3.5 w-3.5 text-text-tertiary group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
