'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, DollarSign, ShoppingCart, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MachineRanking {
  id: string;
  code: string;
  name: string;
  location: string;
  status: string;
  revenue: number;
  sales: number;
  ticket: number;
  products_count: number;
  health_score: number;
}

interface ProductRanking {
  name: string;
  revenue: number;
  sales: number;
  machines_count: number;
  ticket: number;
}

interface HealthScore {
  id: string;
  code: string;
  name: string;
  score: number;
  status: string;
  issues: string[];
}

interface RankingsData {
  machines: MachineRanking[];
  products: ProductRanking[];
  health_scores: HealthScore[];
  summary: {
    total_machines: number;
    active_machines: number;
    avg_revenue: number;
    machines_with_issues: number;
  };
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-success bg-success-soft';
  if (score >= 50) return 'text-warning bg-warning-soft';
  return 'text-danger bg-danger-soft';
}

function getScoreIcon(score: number) {
  if (score >= 70) return <CheckCircle className="h-4 w-4 text-success" />;
  if (score >= 50) return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-danger" />;
}

export default function RankingsPage() {
  const [period, setPeriod] = useState('30d');
  const [sortBy, setSortBy] = useState('revenue');
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period, sort: sortBy });

    fetch(`/api/app/rankings?${params}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        }
      })
      .finally(() => setLoading(false));
  }, [period, sortBy]);

  const hasData = data && data.machines.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
          <p className="text-muted-foreground">
            Compare o desempenho das suas máquinas e produtos
          </p>
        </div>
        <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue>
              {period === '7d' ? 'Últimos 7 dias'
               : period === '30d' ? 'Últimos 30 dias'
               : period === '90d' ? 'Últimos 90 dias'
               : period === '180d' ? 'Últimos 180 dias'
               : period === '365d' ? 'Último ano'
               : period === 'all' ? 'Todo o histórico'
               : period}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="180d">Últimos 180 dias</SelectItem>
            <SelectItem value="365d">Último ano</SelectItem>
            <SelectItem value="all">Todo o histórico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium">Sem dados para exibir</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre máquinas e importe dados para ver os rankings
            </p>
            <a href="/app/importar">
              <Button variant="outline" className="mt-4">Importar Dados</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{data.summary.total_machines}</div>
                <p className="text-sm text-muted-foreground">Total de Máquinas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{data.summary.active_machines}</div>
                <p className="text-sm text-muted-foreground">Máquinas Ativas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  R$ {data.summary.avg_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-muted-foreground">Receita Média</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className={`text-2xl font-bold ${data.summary.machines_with_issues > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {data.summary.machines_with_issues}
                </div>
                <p className="text-sm text-muted-foreground">Precisam de Atenção</p>
              </CardContent>
            </Card>
          </div>

          {/* Rankings Tabs */}
          <Tabs defaultValue="machines">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="machines">
                <DollarSign className="mr-2 h-4 w-4" />
                Máquinas
              </TabsTrigger>
              <TabsTrigger value="products">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="health">
                <TrendingUp className="mr-2 h-4 w-4" />
                Score de Saúde
              </TabsTrigger>
            </TabsList>

            {/* Machines Ranking */}
            <TabsContent value="machines" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Ranking de Máquinas
                      </CardTitle>
                      <CardDescription>
                        Ordenado por {sortBy === 'revenue' ? 'receita' : sortBy === 'sales' ? 'vendas' : 'ticket médio'}
                      </CardDescription>
                    </div>
                    <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Receita</SelectItem>
                        <SelectItem value="sales">Vendas</SelectItem>
                        <SelectItem value="ticket">Ticket Médio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Máquina</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Ticket</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.machines.map((machine, index) => (
                        <TableRow key={machine.id}>
                          <TableCell className="font-medium">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                              index === 0 ? 'bg-warning-soft text-warning' :
                              index === 1 ? 'bg-surface-subtle text-text-secondary' :
                              index === 2 ? 'bg-brand-amber/15 text-brand-amber' :
                              'text-text-tertiary'
                            }`}>
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{machine.name}</p>
                              <p className="text-xs text-text-tertiary">{machine.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>{machine.location}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            R$ {machine.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{machine.sales}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            R$ {machine.ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${getScoreColor(machine.health_score)}`}>
                              {machine.health_score}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Ranking */}
            <TabsContent value="products" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Ranking de Produtos
                  </CardTitle>
                  <CardDescription>
                    Top 20 produtos por receita
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Ticket</TableHead>
                        <TableHead className="text-right">Máquinas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.products.map((product, index) => (
                        <TableRow key={product.name}>
                          <TableCell className="font-medium">
                            {index < 3 ? (
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {index + 1}
                              </span>
                            ) : (
                              index + 1
                            )}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {product.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">{product.sales}</TableCell>
                          <TableCell className="text-right">
                            R$ {product.ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">{product.machines_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Health Score */}
            <TabsContent value="health" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score de Saúde</CardTitle>
                  <CardDescription>
                    Máquinas ordenadas por score (menor primeiro)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.health_scores.map((machine) => (
                      <div
                        key={machine.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          {getScoreIcon(machine.score)}
                          <div>
                            <p className="font-medium">{machine.name}</p>
                            <p className="text-sm text-muted-foreground">{machine.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {machine.issues.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {machine.issues.map((issue, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getScoreColor(machine.score)}`}>
                            <span className="text-lg font-bold">{machine.score}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
