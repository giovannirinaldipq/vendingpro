'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, CalendarClock, Package2, ShoppingCart, ArrowRight, Sparkles,
  Info, Repeat, Pin, TrendingUp, TrendingDown, FileDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Schedule {
  machine_id: string;
  machine_name: string;
  location_name: string | null;
  best_weekday_label: string;
  best_hour: number;
  reason: string;
  reason_detail?: string[];
  avg_daily_sales?: number;
  days_since_last_visit?: number | null;
  next_suggested_date: string;
  last_visit_at: string | null;
  urgency: 'low' | 'medium' | 'high';
}

interface Prediction {
  product_id: string;
  product_name: string;
  current_quantity: number;
  avg_daily_consumption: number;
  days_of_stock: number | null;
  estimated_runout_date: string | null;
  status: 'ok' | 'low' | 'critical' | 'depleted';
}

interface PurchaseItem {
  product_id: string;
  product_name: string;
  current_quantity: number;
  avg_daily_consumption: number;
  suggested_purchase_quantity: number;
  reason: string;
}

interface SwapSuggestion {
  machine_id: string;
  machine_name: string;
  action: 'keep' | 'swap';
  product_id: string;
  product_name: string;
  avg_daily_sales: number;
  total_sales: number;
  revenue_30d: number;
  rank_in_machine: number;
  total_products_in_machine: number;
  swap_for?: { product_id: string; product_name: string; reason: string };
  reason_detail: string[];
}

const URGENCY_TONE: Record<string, 'danger' | 'warning' | 'info'> = {
  high: 'danger', medium: 'warning', low: 'info',
};
const STATUS_TONE: Record<string, 'danger' | 'warning' | 'amber' | 'success'> = {
  depleted: 'danger', critical: 'danger', low: 'warning', ok: 'success',
};
const STATUS_LABEL: Record<string, string> = {
  depleted: 'Acabou', critical: 'Crítico', low: 'Baixo', ok: 'OK',
};

const PURCHASE_PRESETS = [7, 15, 30] as const;

export default function SuggestionsPage() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [purchase, setPurchase] = useState<PurchaseItem[]>([]);
  const [swaps, setSwaps] = useState<SwapSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSchedule, setExpandedSchedule] = useState<Set<string>>(new Set());
  const [expandedSwap, setExpandedSwap] = useState<Set<string>>(new Set());

  // Period selector pra lista de compras
  const [purchaseDays, setPurchaseDays] = useState<number>(30);
  const [purchaseCustom, setPurchaseCustom] = useState<string>('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, p, pu, sw] = await Promise.all([
        fetch('/api/app/suggestions/schedule').then(r => r.json()),
        fetch('/api/app/suggestions/inventory').then(r => r.json()),
        fetch(`/api/app/suggestions/purchase?days=${purchaseDays}`).then(r => r.json()),
        fetch('/api/app/suggestions/swap').then(r => r.json()),
      ]);
      setSchedule(s.data ?? []);
      setPredictions(p.data ?? []);
      setPurchase(pu.data ?? []);
      setSwaps(sw.data ?? []);
      setLoading(false);
    })();
    // Initial load só; mudança de purchaseDays usa reloadPurchase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadPurchase = useCallback(async (days: number) => {
    setPurchaseLoading(true);
    try {
      const pu = await fetch(`/api/app/suggestions/purchase?days=${days}`).then(r => r.json());
      setPurchase(pu.data ?? []);
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  function applyPreset(d: number) {
    setPurchaseDays(d);
    setPurchaseCustom('');
    reloadPurchase(d);
  }

  function applyCustom() {
    const n = parseInt(purchaseCustom, 10);
    if (Number.isFinite(n) && n > 0 && n <= 180) {
      setPurchaseDays(n);
      reloadPurchase(n);
    }
  }

  /**
   * Gera PDF da lista de compras via window.print() em página dedicada.
   * Sem dependências externas (jsPDF) — usa o motor de impressão do browser
   * que oferece "Salvar como PDF" como destino padrão.
   */
  function exportPurchaseListPdf() {
    if (purchase.length === 0) return;
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const totalItems = purchase.reduce((s, p) => s + p.suggested_purchase_quantity, 0);
    const rows = purchase.map(p => `
      <tr>
        <td>${p.product_name}</td>
        <td class="num">${p.current_quantity}</td>
        <td class="num">${p.avg_daily_consumption}</td>
        <td class="num bold">${p.suggested_purchase_quantity}</td>
        <td class="check"><input type="checkbox" /></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Lista de Compras — ${now}</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; margin: 32px; color: #142659; }
        h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }
        .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
        .meta { display: flex; gap: 18px; margin-bottom: 24px; font-size: 12px; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
        .meta b { color: #142659; font-weight: 600; font-size: 14px; display: block; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { text-align: left; border-bottom: 2px solid #142659; padding: 8px 6px; font-weight: 600; }
        thead th.num { text-align: right; }
        thead th.check { width: 32px; text-align: center; }
        tbody td { padding: 10px 6px; border-bottom: 1px solid #e2e8f0; }
        tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }
        tbody td.bold { font-weight: 700; color: #142659; }
        tbody td.check { text-align: center; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { body { margin: 18mm; } .no-print { display: none; } button { display: none; } }
      </style></head><body>
      <h1>Lista de Compras</h1>
      <div class="subtitle">Vending Pro · gerado em ${now} · cobertura ${purchaseDays} dia(s)</div>
      <div class="meta">
        <div><b>${purchase.length}</b> SKUs distintos</div>
        <div><b>${totalItems.toLocaleString('pt-BR')}</b> unidades total</div>
        <div><b>${purchaseDays}</b> dias de cobertura</div>
      </div>
      <table>
        <thead><tr>
          <th>Produto</th>
          <th class="num">Em estoque</th>
          <th class="num">Consumo/dia</th>
          <th class="num">Comprar</th>
          <th class="check">✓</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Vending Pro — gestão para máquinas de venda · Os valores são sugestões baseadas em consumo dos últimos 14 dias.</div>
      <button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;background:#fbbf24;color:#1e3a8a;border:none;border-radius:6px;padding:10px 16px;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.1)">Imprimir / Salvar PDF</button>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  function toggleScheduleRow(id: string) {
    setExpandedSchedule(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSwapRow(id: string) {
    setExpandedSwap(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const keepItems = swaps.filter(s => s.action === 'keep');
  const swapItems = swaps.filter(s => s.action === 'swap');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Sugestões inteligentes</h1>
          <Sparkles className="h-5 w-5 text-brand-amber" strokeWidth={2} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
          O sistema analisa seus dados e te diz o que fazer — sempre com o &ldquo;por quê&rdquo;.
        </p>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule"><CalendarClock className="mr-2 h-4 w-4" />Abastecimento</TabsTrigger>
          <TabsTrigger value="mix"><Repeat className="mr-2 h-4 w-4" />Manter vs Trocar</TabsTrigger>
          <TabsTrigger value="predictions"><Package2 className="mr-2 h-4 w-4" />Previsão estoque</TabsTrigger>
          <TabsTrigger value="purchase"><ShoppingCart className="mr-2 h-4 w-4" />Lista de compras</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Quando visitar cada máquina</CardTitle>
              <CardDescription>
                Baseado em 4 semanas de vendas. Sugerimos o dia/horário de menor movimento pra evitar fila —
                clique numa linha pra ver o porquê.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <LoaderStub /> : schedule.length === 0 ? (
                <EmptyStateV2
                  illustration="no-data"
                  title="Aprendendo seu padrão de vendas"
                  description="Precisamos de pelo menos 4 semanas de vendas pra sugerir os melhores dias e horários de visita."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Próxima visita sugerida</TableHead>
                      <TableHead>Janela ideal</TableHead>
                      <TableHead>Última visita</TableHead>
                      <TableHead>Urgência</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map(s => (
                      <>
                        <TableRow
                          key={s.machine_id}
                          className="cursor-pointer hover:bg-surface-subtle/60"
                          onClick={() => toggleScheduleRow(s.machine_id)}
                        >
                          <TableCell>
                            <div className="font-medium">{s.machine_name}</div>
                            {s.location_name && <div className="text-xs text-text-tertiary">{s.location_name}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium font-mono tabular-nums">
                              {new Date(s.next_suggested_date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-text-secondary">{s.reason}</TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {s.last_visit_at ? new Date(s.last_visit_at).toLocaleDateString('pt-BR') : 'nunca'}
                          </TableCell>
                          <TableCell>
                            <Pill tone={URGENCY_TONE[s.urgency]} dot size="sm">
                              {s.urgency === 'high' ? 'Urgente' : s.urgency === 'medium' ? 'Atenção' : 'Normal'}
                            </Pill>
                          </TableCell>
                          <TableCell>
                            <Link href={`/checkin/${s.machine_id}`} onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="outline">
                                Check-in agora<ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                        {expandedSchedule.has(s.machine_id) && s.reason_detail && (
                          <TableRow key={`${s.machine_id}-detail`} className="bg-info-soft/30 border-l-2 border-l-info">
                            <TableCell colSpan={6} className="py-3">
                              <div className="flex gap-3">
                                <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-text-primary">Por que essa sugestão:</p>
                                  <ul className="space-y-0.5 text-xs text-text-secondary">
                                    {s.reason_detail.map((bullet, i) => (
                                      <li key={i} className="flex gap-2">
                                        <span className="text-text-tertiary">•</span>
                                        <span>{bullet}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mix" className="mt-4 space-y-4">
          {/* KEEP — top vendedores */}
          <Card className="border-success/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pin className="h-4 w-4 text-success" />
                Manter abastecido (best-sellers)
              </CardTitle>
              <CardDescription>
                Os produtos mais vendidos de cada máquina nos últimos 30 dias. Não deixe acabar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <LoaderStub /> : keepItems.length === 0 ? (
                <p className="text-sm text-text-tertiary py-4">Sem vendas suficientes pra ranking ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Rank</TableHead>
                      <TableHead className="text-right">Vendas/30d</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keepItems.map(it => (
                      <TableRow key={`${it.machine_id}-${it.product_id}`}>
                        <TableCell className="text-sm">{it.machine_name}</TableCell>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            {it.rank_in_machine === 1 && <TrendingUp className="h-3.5 w-3.5 text-success" />}
                            {it.product_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Pill tone="success" size="sm">{it.rank_in_machine}º de {it.total_products_in_machine}</Pill>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{it.total_sales}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">R$ {it.revenue_30d.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* SWAP — candidatos a trocar */}
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Repeat className="h-4 w-4 text-warning" />
                Considerar trocar (giro baixo)
              </CardTitle>
              <CardDescription>
                Produtos vendendo pouco há 30+ dias. Clique pra ver porquê e qual substituto seria melhor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <LoaderStub /> : swapItems.length === 0 ? (
                <EmptyStateV2
                  illustration="no-alerts"
                  positive
                  title="Mix bem calibrado ✦"
                  description="Nenhum produto suspeito de baixo giro nos últimos 30 dias — sua curadoria está afiada."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Produto atual</TableHead>
                      <TableHead className="text-right">Giro</TableHead>
                      <TableHead>Sugestão de substituto</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {swapItems.map(it => {
                      const rowKey = `${it.machine_id}-${it.product_id}`;
                      return (
                        <>
                          <TableRow
                            key={rowKey}
                            className="cursor-pointer hover:bg-surface-subtle/60"
                            onClick={() => toggleSwapRow(rowKey)}
                          >
                            <TableCell className="text-sm">{it.machine_name}</TableCell>
                            <TableCell>
                              <div className="font-medium flex items-center gap-2">
                                <TrendingDown className="h-3.5 w-3.5 text-warning" />
                                {it.product_name}
                              </div>
                              <div className="text-[11px] text-text-tertiary mt-0.5">{it.rank_in_machine}º de {it.total_products_in_machine}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-mono tabular-nums text-warning">{it.avg_daily_sales}/dia</div>
                              <div className="text-[11px] text-text-tertiary tabular-nums">{it.total_sales} em 30d</div>
                            </TableCell>
                            <TableCell>
                              {it.swap_for ? (
                                <div className="text-sm">
                                  <span className="font-medium text-brand-navy">{it.swap_for.product_name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-text-tertiary">remover ou avaliar mix</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <ChevronToggle expanded={expandedSwap.has(rowKey)} />
                            </TableCell>
                          </TableRow>
                          {expandedSwap.has(rowKey) && (
                            <TableRow key={`${rowKey}-detail`} className="bg-warning-soft/30 border-l-2 border-l-warning">
                              <TableCell colSpan={5} className="py-3">
                                <div className="flex gap-3">
                                  <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-text-primary">Por que trocar:</p>
                                    <ul className="space-y-0.5 text-xs text-text-secondary">
                                      {it.reason_detail.map((bullet, i) => (
                                        <li key={i} className="flex gap-2">
                                          <span className="text-text-tertiary">•</span>
                                          <span>{bullet}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Quanto tempo cada produto dura</CardTitle>
              <CardDescription>Com base no consumo médio dos últimos 14 dias e estoque atual.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <LoaderStub /> : predictions.length === 0 ? (
                <EmptyStateV2
                  illustration="no-machines"
                  title="Sem estoque cadastrado"
                  description="Cadastre os produtos das suas máquinas pra calcular quanto tempo cada item ainda dura."
                  ctaLabel="Ir para estoque"
                  ctaHref="/app/estoque"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Consumo/dia</TableHead>
                      <TableHead className="text-right">Dias restantes</TableHead>
                      <TableHead>Estimativa de zerar</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map(p => (
                      <TableRow key={p.product_id} className={p.status === 'critical' || p.status === 'depleted' ? 'bg-danger-soft/30' : ''}>
                        <TableCell className="font-medium">{p.product_name}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{p.current_quantity}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{p.avg_daily_consumption}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{p.days_of_stock ?? '∞'}</TableCell>
                        <TableCell className="tabular-nums">{p.estimated_runout_date ? new Date(p.estimated_runout_date).toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell>
                          <Pill tone={STATUS_TONE[p.status]} size="sm" dot>
                            {STATUS_LABEL[p.status]}
                          </Pill>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>O que comprar agora</CardTitle>
                <CardDescription>
                  Defina pra quantos dias você quer comprar — calculamos a quantidade exata pra cobrir o consumo.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPurchaseListPdf}
                disabled={purchase.length === 0}
                className="shrink-0"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-subtle/40 p-3">
                <span className="text-xs font-medium text-text-secondary mr-1">Estoque para:</span>
                {PURCHASE_PRESETS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => applyPreset(d)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      purchaseDays === d && !purchaseCustom
                        ? 'bg-brand-navy text-white'
                        : 'bg-surface-card text-text-secondary hover:bg-surface-subtle'
                    )}
                  >
                    {d} dias
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    placeholder="Outro"
                    value={purchaseCustom}
                    onChange={(e) => setPurchaseCustom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                    className="h-8 w-[80px] text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={applyCustom} disabled={!purchaseCustom}>
                    Aplicar
                  </Button>
                </div>
                <span className="ml-auto text-xs text-text-tertiary tabular-nums">
                  Calculando pra {purchaseDays} dias
                </span>
              </div>

              {loading || purchaseLoading ? <LoaderStub /> : purchase.length === 0 ? (
                <EmptyStateV2
                  illustration="no-alerts"
                  positive
                  title={`Estoque OK para os próximos ${purchaseDays} dias ✦`}
                  description="Não precisa comprar nada agora. A previsão é recalculada conforme entram novas vendas."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Em estoque</TableHead>
                      <TableHead className="text-right">Consumo/dia</TableHead>
                      <TableHead className="text-right">Comprar</TableHead>
                      <TableHead>Por quê</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.map(p => (
                      <TableRow key={p.product_id}>
                        <TableCell className="font-medium">{p.product_name}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{p.current_quantity}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{p.avg_daily_consumption}</TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums text-brand-navy">{p.suggested_purchase_quantity}</TableCell>
                        <TableCell className="text-sm text-text-secondary">{p.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoaderStub() {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div>;
}

function ChevronToggle({ expanded }: { expanded: boolean }) {
  return (
    <span className={cn(
      'inline-block text-text-tertiary text-xs transition-transform',
      expanded && 'rotate-90'
    )}>▶</span>
  );
}
