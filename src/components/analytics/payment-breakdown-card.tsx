'use client';

import { useEffect, useState } from 'react';
import { Loader2, CreditCard, Smartphone, Banknote, Ticket, Bus, HelpCircle, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { cn } from '@/lib/utils';

interface BreakdownRow {
  payment_method: string;
  transaction_count: number;
  items_sold: number;
  revenue: number;
  share_percent: number;
}

interface PaymentBreakdownData {
  rows: BreakdownRow[];
  total_revenue: number;
  total_transactions: number;
  days: number | null;
}

const METHOD_META: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  credit:            { label: 'Crédito',          icon: CreditCard, color: 'text-info',    bg: 'bg-info/15' },
  debit:             { label: 'Débito',           icon: CreditCard, color: 'text-brand-navy', bg: 'bg-brand-navy/10' },
  pix:               { label: 'PIX',              icon: Smartphone, color: 'text-success', bg: 'bg-success-soft' },
  cash:              { label: 'Dinheiro',         icon: Banknote,   color: 'text-warning', bg: 'bg-warning-soft' },
  meal_voucher:      { label: 'Vale Refeição/Alimentação', icon: Ticket, color: 'text-brand-amber', bg: 'bg-brand-amber/15' },
  transport_voucher: { label: 'Vale Transporte',  icon: Bus,        color: 'text-text-secondary', bg: 'bg-surface-subtle' },
  other_voucher:     { label: 'Outros vouchers',  icon: Ticket,     color: 'text-text-secondary', bg: 'bg-surface-subtle' },
  cashless:          { label: 'Cashless (agregado)', icon: Smartphone, color: 'text-text-tertiary', bg: 'bg-surface-subtle' },
  unknown:           { label: 'Não identificado', icon: HelpCircle, color: 'text-text-tertiary', bg: 'bg-surface-subtle' },
};

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface PaymentBreakdownCardProps {
  days?: number | 'all';
  machineId?: string;
  className?: string;
}

export function PaymentBreakdownCard({
  days = 30, machineId, className,
}: PaymentBreakdownCardProps) {
  const [data, setData] = useState<PaymentBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('days', String(days));
    if (machineId) params.set('machine_id', machineId);

    fetch(`/api/app/analytics/payment-breakdown?${params}`)
      .then(r => r.json())
      .then(json => { if (!canceled && json.success) setData(json.data); })
      .finally(() => { if (!canceled) setLoading(false); });

    return () => { canceled = true; };
  }, [days, machineId]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Forma de pagamento</CardTitle>
        <CardDescription>
          O que mais sai: PIX, débito, crédito, vale, etc — {days === 'all' ? 'desde sempre' : `últimos ${days} dias`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-tertiary">
            Sem vendas no período selecionado.
          </p>
        ) : (
          <div className="space-y-3">
            {data.rows.map(row => {
              const meta = METHOD_META[row.payment_method] ?? METHOD_META.unknown;
              const Icon = meta.icon;
              return (
                <div key={row.payment_method} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                      <Icon className={cn('h-4 w-4', meta.color)} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{meta.label}</p>
                        <p className="text-sm font-semibold tabular-nums">{fmtBRL(row.revenue)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-text-tertiary tabular-nums">
                          {row.transaction_count.toLocaleString('pt-BR')} venda(s) · {row.items_sold} item(ns)
                        </p>
                        <Pill tone="outline" size="sm">{row.share_percent.toFixed(1)}%</Pill>
                      </div>
                    </div>
                  </div>
                  {/* Barra de share */}
                  <div className="h-1 w-full rounded-full bg-surface-subtle overflow-hidden ml-11">
                    <div
                      className={cn('h-full rounded-full', meta.bg.replace('/15', '/60').replace('-soft', ''))}
                      style={{ width: `${Math.min(100, row.share_percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="border-t border-border-default pt-3 mt-4 flex items-center justify-between text-xs text-text-tertiary">
              <span>Total no período</span>
              <span className="font-semibold tabular-nums text-text-primary">{fmtBRL(data.total_revenue)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
