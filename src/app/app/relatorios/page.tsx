'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, Calendar, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill } from '@/components/ui/pill';

function isoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function previousMonthValue(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return isoMonth(d);
}
function currentMonthValue(): string {
  return isoMonth(new Date());
}
function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}
function today(): string {
  return isoDate(new Date());
}

export default function RelatoriosPage() {
  const [month, setMonth] = useState(previousMonthValue());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function downloadMonthlyPdf(targetMonth: string = month) {
    window.open(`/api/app/reports/monthly?month=${targetMonth}`, '_blank');
  }

  function downloadSalesCsv(fromOverride?: string, toOverride?: string) {
    const sp = new URLSearchParams();
    const f = fromOverride ?? from;
    const t = toOverride ?? to;
    if (f) sp.set('from', f);
    if (t) sp.set('to', t);
    window.open(`/api/app/reports/sales-csv?${sp}`, '_blank');
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-text-secondary">Relatório mensal executivo + export de vendas para Excel.</p>
      </div>

      {/* Atalhos 1-click */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-amber" />
            Atalhos rápidos
          </CardTitle>
          <CardDescription>Os relatórios mais pedidos, a um clique de distância.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction
              title="Mês passado (PDF)"
              hint="Relatório executivo do último mês fechado"
              onClick={() => downloadMonthlyPdf(previousMonthValue())}
            />
            <QuickAction
              title="Mês atual parcial (PDF)"
              hint="Acompanhamento do mês em andamento"
              onClick={() => downloadMonthlyPdf(currentMonthValue())}
            />
            <QuickAction
              title="Últimos 7 dias (CSV)"
              hint="Vendas da última semana em Excel"
              onClick={() => downloadSalesCsv(dateAgo(7), today())}
            />
            <QuickAction
              title="Últimos 30 dias (CSV)"
              hint="Vendas do último mês corrido"
              onClick={() => downloadSalesCsv(dateAgo(30), today())}
            />
            <QuickAction
              title="Últimos 90 dias (CSV)"
              hint="Histórico recente — trimestre"
              onClick={() => downloadSalesCsv(dateAgo(90), today())}
            />
            <QuickAction
              title="Ano corrente (CSV)"
              hint={`Vendas desde 01/01/${new Date().getFullYear()}`}
              onClick={() => downloadSalesCsv(`${new Date().getFullYear()}-01-01`, today())}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Relatório mensal (PDF)</CardTitle>
          <CardDescription>Resultado consolidado, top máquinas, produtos campeões, alertas e visitas do mês.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="month">Mês de referência</Label>
            <Input id="month" type="month" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <Button onClick={() => downloadMonthlyPdf()}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button>
          <div className="flex items-start gap-2 text-xs text-text-tertiary">
            <Pill tone="info" size="sm">Auto</Pill>
            <span>Envio automático por email todo dia 1º quando o Vercel Cron estiver configurado apontando para <code className="bg-surface-subtle px-1 rounded">POST /api/cron/monthly-reports</code>.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Export de vendas (CSV)</CardTitle>
          <CardDescription>Todas as vendas no período, com BOM UTF-8 para abrir direto no Excel BR.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="from">De</Label>
              <Input id="from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Até</Label>
              <Input id="to" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => downloadSalesCsv()}><FileDown className="mr-2 h-4 w-4" />Baixar CSV</Button>
          <p className="text-xs text-text-tertiary">Limite de 50.000 linhas por download. Para volumes maiores, filtre por período.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-1 rounded-lg border border-border-default bg-surface-card p-3 text-left transition-colors hover:border-brand-navy hover:bg-brand-navy/5"
    >
      <div className="flex items-center gap-2 w-full">
        <FileDown className="h-4 w-4 text-brand-navy" />
        <span className="font-medium text-sm text-text-primary flex-1">{title}</span>
      </div>
      <p className="text-[11px] text-text-tertiary leading-snug">{hint}</p>
    </button>
  );
}
