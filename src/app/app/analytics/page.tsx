'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Calendar, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Análise detalhada das suas vendas
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <Monitor className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as máquinas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Heatmap Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor</CardTitle>
          <CardDescription>
            Visualize os horários de pico de vendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm font-medium">Mapa de Calor</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Importe dados de vendas para visualizar o mapa de calor
              </p>
              <a href="/app/importar">
                <Button variant="outline" className="mt-4">Importar Dados</Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Vendas</CardTitle>
            <CardDescription>Vendas ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Gráfico disponível após importação de dados
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Dia da Semana</CardTitle>
            <CardDescription>Distribuição semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Gráfico disponível após importação de dados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Produtos</CardTitle>
          <CardDescription>Performance por produto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Análise disponível após importação de dados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
