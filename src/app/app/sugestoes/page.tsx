'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, CalendarClock, Package2, ShoppingCart, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const URGENCY: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
};
const STATUS: Record<string, string> = {
  depleted: 'bg-red-100 text-red-700',
  critical: 'bg-orange-100 text-orange-700',
  low: 'bg-amber-100 text-amber-700',
  ok: 'bg-green-100 text-green-700',
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
        <h1 className="text-2xl font-bold">Sugestões inteligentes</h1>
        <p className="text-sm text-muted-foreground">O sistema analisa seus dados e diz o que fazer.</p>
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
              {loading ? <Loader stub /> : schedule.length === 0 ? <Empty msg="Sem dados de venda suficientes." /> : (
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
                          {s.location_name && <div className="text-xs text-muted-foreground">{s.location_name}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{new Date(s.next_suggested_date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.reason}</TableCell>
                        <TableCell className="text-sm">{s.last_visit_at ? new Date(s.last_visit_at).toLocaleDateString('pt-BR') : 'nunca'}</TableCell>
                        <TableCell><Badge className={URGENCY[s.urgency]}>{s.urgency === 'high' ? 'Urgente' : s.urgency === 'medium' ? 'Atenção' : 'Normal'}</Badge></TableCell>
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
              {loading ? <Loader stub /> : predictions.length === 0 ? <Empty msg="Sem estoque cadastrado." /> : (
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
                      <TableRow key={p.product_id} className={p.status === 'critical' || p.status === 'depleted' ? 'bg-red-50/40' : ''}>
                        <TableCell className="font-medium">{p.product_name}</TableCell>
                        <TableCell className="text-right">{p.current_quantity}</TableCell>
                        <TableCell className="text-right">{p.avg_daily_consumption}</TableCell>
                        <TableCell className="text-right">{p.days_of_stock ?? '∞'}</TableCell>
                        <TableCell>{p.estimated_runout_date ? new Date(p.estimated_runout_date).toLocaleDateString('pt-BR') : '—'}</TableCell>
                        <TableCell><Badge className={STATUS[p.status]}>{STATUS_LABEL[p.status]}</Badge></TableCell>
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
              {loading ? <Loader stub /> : purchase.length === 0 ? <Empty msg="Estoque OK para os próximos 30 dias!" /> : (
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
                        <TableCell className="text-right">{p.current_quantity}</TableCell>
                        <TableCell className="text-right">{p.avg_daily_consumption}</TableCell>
                        <TableCell className="text-right font-semibold">{p.suggested_purchase_quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reason}</TableCell>
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

function Loader({ stub }: { stub?: boolean }) {
  return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-12 text-muted-foreground"><AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />{msg}</div>;
}
