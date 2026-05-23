'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
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

export default function RankingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rankings</h1>
          <p className="text-muted-foreground">
            Compare o desempenho das suas máquinas
          </p>
        </div>
        <Select defaultValue="30d">
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rankings Tabs */}
      <Tabs defaultValue="revenue">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue">
            <DollarSign className="mr-2 h-4 w-4" />
            Receita
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="ticket">
            <TrendingUp className="mr-2 h-4 w-4" />
            Ticket Médio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking por Receita
              </CardTitle>
              <CardDescription>
                Máquinas ordenadas por faturamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Cadastre máquinas e importe dados para ver o ranking
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking por Vendas
              </CardTitle>
              <CardDescription>
                Máquinas ordenadas por quantidade de vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Cadastre máquinas e importe dados para ver o ranking
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ticket" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking por Ticket Médio
              </CardTitle>
              <CardDescription>
                Máquinas ordenadas por valor médio de venda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Cadastre máquinas e importe dados para ver o ranking
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle>Score de Saúde</CardTitle>
          <CardDescription>
            Avaliação geral das suas máquinas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <span className="text-2xl font-bold text-muted-foreground">?</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Score disponível após importação de dados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
