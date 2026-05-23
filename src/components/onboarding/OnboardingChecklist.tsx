'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, X, MapPin, Monitor, Package, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    { done: status.locations > 0, label: 'Cadastrar primeiro local', href: '/app/locais/novo', icon: MapPin },
    { done: status.machines > 0, label: 'Adicionar primeira máquina', href: '/app/maquinas/nova', icon: Monitor },
    { done: status.products > 0, label: 'Cadastrar produtos', href: '/app/produtos/novo', icon: Package },
    { done: status.sales > 0, label: 'Importar planilha do VM PAY', href: '/app/importar', icon: FileSpreadsheet },
  ];
  const completed = steps.filter(s => s.done).length;

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Bem-vindo à VendingPro</CardTitle>
          <CardDescription>Complete os primeiros passos para começar a usar a plataforma ({completed}/{steps.length}).</CardDescription>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map(s => (
            <Link key={s.href} href={s.done ? '#' : s.href}>
              <div className={`flex items-center gap-3 p-2 rounded ${s.done ? 'text-muted-foreground' : 'hover:bg-white cursor-pointer'}`}>
                {s.done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <s.icon className={`h-4 w-4 ${s.done ? 'text-muted-foreground' : 'text-blue-600'}`} />
                <span className={`flex-1 text-sm ${s.done ? 'line-through' : 'font-medium'}`}>{s.label}</span>
                {!s.done && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
