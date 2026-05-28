'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Settings as SettingsIcon, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCardHero } from '@/components/ui/kpi-hero';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface MachineResult {
  machine_id: string;
  machine_name?: string;
  revenue: number;
  fees: number;
  cmv: number;
  fixed_costs: number;
  net_result: number;
  is_loss: boolean;
  sales_count: number;
}

interface Summary {
  period_days: number;
  total: { revenue: number; fees: number; cmv: number; fixed_costs: number; net_result: number; sales_count: number };
  per_machine: MachineResult[];
  machines_in_loss: number;
  products_without_cost?: number;
}

interface FinanceSettings {
  tenant_id: string;
  card_fee_percent: number;
  pix_fee_percent: number;
  cash_fee_percent: number;
  debit_fee_percent: number;
  loss_alert_enabled: boolean;
  loss_alert_period_days: number;
}

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [period, setPeriod] = useState('30');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, fs] = await Promise.all([
        fetch(`/api/app/financeiro/summary?period_days=${period}`).then(r => r.json()),
        fetch('/api/app/finance-settings').then(r => r.json()),
      ]);
      setSummary(s.data);
      setSettings(fs.data);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/app/finance-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_fee_percent: settings.card_fee_percent,
          pix_fee_percent: settings.pix_fee_percent,
          cash_fee_percent: settings.cash_fee_percent,
          loss_alert_enabled: settings.loss_alert_enabled,
          loss_alert_period_days: settings.loss_alert_period_days,
        }),
      });
      if (res.ok) toast.success('Configurações salvas');
      else toast.error('Falha ao salvar');
    } finally { setSavingSettings(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Resultado real por máquina (receita − taxas − CMV − custos fixos).</p>
        </div>
        <Select value={period} onValueChange={v => v && setPeriod(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading || !summary ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {summary.products_without_cost != null && summary.products_without_cost > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning-soft/30 p-3 flex gap-2 text-xs text-text-secondary">
              <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="text-text-primary">{summary.products_without_cost} produto(s) sem custo cadastrado.</strong>{' '}
                CMV pode estar subestimado — o resultado líquido aparenta ser maior do que é.{' '}
                <Link href="/app/produtos" className="text-brand-navy hover:underline font-medium">Cadastrar custos →</Link>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-5">
            {/* HERO Resultado Líquido — métrica decisiva do financeiro */}
            <div className="md:col-span-2">
              <KpiCardHero
                label="Resultado Líquido"
                value={fmtBRL(summary.total.net_result)}
                icon={summary.total.net_result >= 0 ? TrendingUp : TrendingDown}
                subtitle={`${summary.total.sales_count.toLocaleString('pt-BR')} vendas · receita ${fmtBRL(summary.total.revenue)}`}
              />
            </div>
            <KpiCard
              label="Receita bruta"
              value={fmtBRL(summary.total.revenue)}
              icon={DollarSign}
            />
            <KpiCard
              label="Custos totais"
              value={fmtBRL(summary.total.fees + summary.total.cmv + summary.total.fixed_costs)}
              hint={`Taxas ${fmtBRL(summary.total.fees)} · CMV ${fmtBRL(summary.total.cmv)} · Fixos ${fmtBRL(summary.total.fixed_costs)}`}
            />
            <KpiCard
              label="Em prejuízo"
              value={String(summary.machines_in_loss)}
              icon={AlertTriangle}
              hint={summary.machines_in_loss > 0 ? 'máquinas no negativo' : 'tudo no positivo'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Por máquina</CardTitle>
              <CardDescription>Resultado dos últimos {summary.period_days} dias</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Máquina</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Taxas</TableHead>
                    <TableHead className="text-right">CMV</TableHead>
                    <TableHead className="text-right">Fixos</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.per_machine.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma máquina ativa com vendas no período.</TableCell></TableRow>
                  ) : summary.per_machine.map(m => (
                    <TableRow key={m.machine_id} className={m.is_loss ? 'bg-danger-soft/30' : ''}>
                      <TableCell className="font-medium">{m.machine_name}</TableCell>
                      <TableCell className="text-right">{fmtBRL(m.revenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtBRL(m.fees)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtBRL(m.cmv)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtBRL(m.fixed_costs)}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold tabular-nums ${m.net_result >= 0 ? 'text-success' : 'text-danger'}`}>
                        <span className="inline-flex items-center gap-1 justify-end">
                          {m.net_result >= 0
                            ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                            : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
                          {m.net_result >= 0 ? '+' : '−'} {fmtBRL(Math.abs(m.net_result))}
                        </span>
                        {m.is_loss && <Badge className="ml-2 bg-danger-soft text-danger">Prejuízo</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/app/financeiro/custos?machine_id=${m.machine_id}`}>
                          <Button variant="ghost" size="sm">Custos<ArrowRight className="ml-1 h-3 w-3" /></Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" />Configurações financeiras</CardTitle>
              <CardDescription>Taxas aplicadas sobre vendas e alerta de prejuízo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings && (
                <>
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Taxa cartão de crédito (%)</Label>
                      <Input type="number" step="0.1" min="0" max="30" value={settings.card_fee_percent}
                        onChange={e => setSettings({ ...settings, card_fee_percent: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa PIX (%)</Label>
                      <Input type="number" step="0.1" min="0" max="10" value={settings.pix_fee_percent}
                        onChange={e => setSettings({ ...settings, pix_fee_percent: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa dinheiro (%)</Label>
                      <Input type="number" step="0.1" min="0" max="10" value={settings.cash_fee_percent}
                        onChange={e => setSettings({ ...settings, cash_fee_percent: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Taxa cartão de débito (%)</Label>
                      <Input type="number" step="0.1" min="0" max="30" value={settings.debit_fee_percent || 0}
                        onChange={e => setSettings({ ...settings, debit_fee_percent: Number(e.target.value) })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Alertar quando máquina dá prejuízo</p>
                      <p className="text-sm text-muted-foreground">Cria alerta automático quando uma máquina fecha o período no negativo</p>
                    </div>
                    <Switch checked={settings.loss_alert_enabled}
                      onCheckedChange={v => setSettings({ ...settings, loss_alert_enabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Período de análise (dias)</Label>
                    <Input type="number" min="7" max="90" value={settings.loss_alert_period_days}
                      onChange={e => setSettings({ ...settings, loss_alert_period_days: Number(e.target.value) })} />
                  </div>
                  <Button onClick={saveSettings} disabled={savingSettings}>
                    {savingSettings ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</> : 'Salvar configurações'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
