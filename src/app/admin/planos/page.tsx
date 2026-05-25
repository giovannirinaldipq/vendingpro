'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Dados mockados
const plans = [
  {
    id: '1',
    name: 'Essencial',
    slug: 'essencial',
    price_per_machine: 19,
    minimum_value: 99,
    trial_days: 14,
    features: ['dashboard', 'heatmap', 'ranking', 'products'],
    limits: { max_machines: 20, max_users: 2, history_months: 6 },
    is_active: true,
    clients_count: 18,
  },
  {
    id: '2',
    name: 'Profissional',
    slug: 'profissional',
    price_per_machine: 29,
    minimum_value: 99,
    trial_days: 14,
    features: ['dashboard', 'heatmap', 'ranking', 'products', 'alerts', 'restocking', 'suggestions'],
    limits: { max_machines: 50, max_users: 5, max_restockers: 3, history_months: 12 },
    is_active: true,
    clients_count: 24,
  },
  {
    id: '3',
    name: 'Completo',
    slug: 'completo',
    price_per_machine: 39,
    minimum_value: 99,
    trial_days: 14,
    features: ['dashboard', 'heatmap', 'ranking', 'products', 'alerts', 'restocking', 'suggestions', 'financial', 'inventory', 'conciliation', 'reports'],
    limits: { max_machines: null, max_users: null, max_restockers: null, history_months: null },
    is_active: true,
    clients_count: 6,
  },
];

const featureLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  heatmap: 'Mapa de Calor',
  ranking: 'Rankings',
  products: 'Análise de Produtos',
  alerts: 'Alertas',
  restocking: 'Gestão de Reabastecedor',
  suggestions: 'Sugestões Automáticas',
  financial: 'Controle Financeiro',
  inventory: 'Estoque Central',
  conciliation: 'Conciliação Bancária',
  reports: 'Relatórios',
};

export default function PlansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">
            Gerencie os planos de assinatura
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Plano</DialogTitle>
              <DialogDescription>
                Crie um novo plano de assinatura
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input id="name" placeholder="Ex: Premium" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" placeholder="Ex: premium" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço/Máquina</Label>
                  <Input id="price" type="number" placeholder="29.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum">Valor Mínimo</Label>
                  <Input id="minimum" type="number" placeholder="99.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trial">Dias de Trial</Label>
                  <Input id="trial" type="number" placeholder="14" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Criar Plano
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            {plan.slug === 'profissional' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Mais Popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-danger">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">
                  R$ {plan.price_per_machine}
                </span>
                <span className="text-muted-foreground">/máquina/mês</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mínimo mensal</span>
                <span className="font-medium">R$ {plan.minimum_value}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Trial</span>
                <span className="font-medium">{plan.trial_days} dias</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Clientes ativos</span>
                <Badge variant="secondary">{plan.clients_count}</Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Limites</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Máquinas</span>
                    <span>{plan.limits.max_machines ?? 'Ilimitado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usuários</span>
                    <span>{plan.limits.max_users ?? 'Ilimitado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Histórico</span>
                    <span>{plan.limits.history_months ? `${plan.limits.history_months} meses` : 'Ilimitado'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Funcionalidades</p>
                <div className="space-y-1">
                  {Object.keys(featureLabels).map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      {plan.features.includes(feature) ? (
                        <Check className="h-4 w-4 text-brand-amber" strokeWidth={2.5} />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={plan.features.includes(feature) ? '' : 'text-muted-foreground'}>
                        {featureLabels[feature]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
