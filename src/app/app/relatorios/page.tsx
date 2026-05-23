'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function previousMonthValue(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export default function RelatoriosPage() {
  const [month, setMonth] = useState(previousMonthValue());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function downloadMonthlyPdf() {
    window.open(`/api/app/reports/monthly?month=${month}`, '_blank');
  }

  function downloadSalesCsv() {
    const sp = new URLSearchParams();
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    window.open(`/api/app/reports/sales-csv?${sp}`, '_blank');
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Relatório mensal executivo + export de vendas para Excel.</p>
      </div>

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
          <Button onClick={downloadMonthlyPdf}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button>
          <p className="text-xs text-muted-foreground">
            Envio automático por email todo dia 1º (após configurar Vercel Cron apontando para
            <code className="ml-1 bg-muted px-1 rounded">POST /api/cron/monthly-reports</code>).
          </p>
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
          <Button onClick={downloadSalesCsv}><FileDown className="mr-2 h-4 w-4" />Baixar CSV</Button>
          <p className="text-xs text-muted-foreground">Limite de 50.000 linhas por download. Para volumes maiores, filtre por período.</p>
        </CardContent>
      </Card>
    </div>
  );
}
