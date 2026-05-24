'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, CalendarClock, Package2, ShoppingCart, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Button } from '@/components/ui/button';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Schedule {
  machine_id: string;
  machine_name: string;
  location_name: string | null;
  best_weekday_label: string;
  best_hour: number;
  reason: string;
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

const URGENCY_TONE: Record<string, 'danger' | 'warning' | 'info'> = {
  high: 'danger', medium: 'warning', low: 'info',
};
const STATUS_TONE: Record<string, 'danger' | 'warning' | 'amber' | 'success'> = {
  depleted: 'danger', critical: 'danger', low: 'warning', ok: 'success',
};
const STATUS_LABEL: Record<string, string> = {
  depleted: 'Acabou', critical: 'Crítico', low: 'Baixo', ok: 'OK',
};

export default function SuggestionsPage() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [purchase, setPurchase] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, p, pu] = await Promise.all([
        fetch('/api/app/suggestions/schedule').then(r => r.json()),
        fetch('/api/app/suggestions/inventory').then(r => r.json()),
        fetch('/api/app/suggestions/purchase').then(r => r.json()),
      ]);
      setSchedule(s.data ?? []);
      setPredictions(p.data ?? []);
      setPurchase(pu.data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Sugestões inteligentes</h1>
          <Sparkles className="h-5 w-5 text-brand-amber" strokeWidth={2} />
        </div>
        <p className="text-sm text-text-secondary mt-1">O sistema analisa seus dados e te diz o que fazer.</p>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule"><CalendarClock className="mr-2 h-4 w-4" />Abastecimento</TabsTrigger>
          <TabsTrigger value="predictions"><Package2 className="mr-2 h-4 w-4" />Previsão estoque</TabsTrigger>
          <TabsTrigger value="purchase"><ShoppingCart className="mr-2 h-4 w-4" />Lista de compras</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Quando visitar cada máquina</CardTitle>
              <CardDescription>Baseado em 4 semanas de vendas. Sugerimos o dia/horário de menor movimento para evitar fila.</CardDescription>
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
                      <TableRow key={s.machine_id}>
                        <TableCell>
                          <div className="font-medium">{s.machine_name}</div>
                          {s.location_name && <div className="text-xs text-text-tertiary">{s.location_name}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium font-mono tabular-nums">{new Date(s.next_suggested_date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary">{s.reason}</TableCell>
                        <TableCell className="text-sm tabular-nums">{s.last_visit_at ? new Date(s.last_visit_at).toLocaleDateString('pt-BR') : 'nunca'}</TableCell>
                        <TableCell>
                          <Pill tone={URGENCY_TONE[s.urgency]} dot size="sm">
                            {s.urgency === 'high' ? 'Urgente' : s.urgency === 'medium' ? 'Atenção' : 'Normal'}
                          </Pill>
                        </TableCell>
                        <TableCell>
                          <Link href={`/checkin/${s.machine_id}`}>
                            <Button size="sm" variant="outline">Check-in agora<ArrowRight className="ml-1 h-3 w-3" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
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
            <CardHeader>
              <CardTitle>O que comprar agora</CardTitle>
              <CardDescription>Quantidades sugeridas para manter 30 dias de estoque a partir do consumo atual.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <LoaderStub /> : purchase.length === 0 ? (
                <EmptyStateV2
                  illustration="no-alerts"
                  positive
                  title="Estoque OK para os próximos 30 dias ✦"
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
