'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Monitor,
  Loader2,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { StatusDot, machineDbStatusToDot } from '@/components/ui/status-dot';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Machine, Location } from '@/types';

const typeLabels: Record<string, string> = {
  snack_beverage: 'Snacks e Bebidas',
  // Compat com dados legados que ainda não foram normalizados:
  snack: 'Snacks e Bebidas',
  beverage: 'Snacks e Bebidas',
  combo: 'Snacks e Bebidas',
  coffee: 'Café',
  other: 'Outro',
};

interface MachinesResponse {
  machines: (Machine & { location?: Location })[];
  total: number;
}

export default function MachinesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState<MachinesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
    billing_day?: number;
    price_per_machine?: number | null;
    plan_name?: string | null;
  } | null>(null);
  const [stockSummary, setStockSummary] = useState<Record<string, { fill_rate: number | null; critical_slots: number }>>({});

  // Expand dialog
  const [expandOpen, setExpandOpen] = useState(false);
  const [expandQty, setExpandQty] = useState(1);
  const [expanding, setExpanding] = useState(false);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/app/machines?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || 'Erro ao carregar máquinas');
      }
    } catch {
      toast.error('Erro ao carregar máquinas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchMachines, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  useEffect(() => {
    fetch('/api/app/tenant/machines-usage')
      .then(r => r.json())
      .then(j => { if (j.success) setUsage(j.data); })
      .catch(() => {});
  }, [data]);

  useEffect(() => {
    fetch('/api/app/machines/stock-summary')
      .then(r => r.json())
      .then(j => { if (j.success) setStockSummary(j.data); })
      .catch(() => {});
  }, [data]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar esta máquina?')) return;

    try {
      const response = await fetch(`/api/app/machines/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast.success('Máquina desativada com sucesso');
        fetchMachines();
      } else {
        toast.error(result.error?.message || 'Erro ao desativar máquina');
      }
    } catch {
      toast.error('Erro ao desativar máquina');
    }
  };

  function calcProRata(qty: number) {
    if (!usage?.price_per_machine || !usage.billing_day) return null;
    const today = new Date();
    const billingDay = usage.billing_day;
    let nextBilling = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (nextBilling <= today) nextBilling.setMonth(nextBilling.getMonth() + 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.ceil((nextBilling.getTime() - today.getTime()) / 86400000);
    const factor = daysRemaining / daysInMonth;
    return {
      total: Math.round(qty * usage.price_per_machine * factor * 100) / 100,
      daysRemaining,
      daysInMonth,
      factor,
    };
  }

  async function handleExpand() {
    setExpanding(true);
    try {
      const res = await fetch('/api/app/tenant/expand-machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional_machines: expandQty }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`+${expandQty} máquina(s) liberada(s)! Fatura de R$ ${json.data.invoice_total.toFixed(2)} gerada.`);
        setExpandOpen(false);
        setExpandQty(1);
        // Refresh usage
        const r = await fetch('/api/app/tenant/machines-usage');
        const j = await r.json();
        if (j.success) setUsage(j.data);
      } else {
        toast.error(json.error ?? 'Erro ao ampliar plano');
      }
    } catch {
      toast.error('Erro ao ampliar plano');
    } finally {
      setExpanding(false);
    }
  }

  const proRata = calcProRata(expandQty);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Máquinas</h1>
          <p className="text-muted-foreground">
            Gerencie suas máquinas de vending
          </p>
        </div>
        <div className="flex items-center gap-3">
          {usage && (
            <span className={cn(
              "text-sm font-medium tabular-nums",
              usage.used >= usage.limit ? "text-destructive" : "text-muted-foreground"
            )}>
              {usage.used}/{usage.limit} máquinas
            </span>
          )}
          {usage && usage.used >= usage.limit && usage.price_per_machine && (
            <Button variant="outline" onClick={() => setExpandOpen(true)} className="border-brand-amber text-brand-amber hover:bg-brand-amber/10">
              <TrendingUp className="mr-2 h-4 w-4" />
              Ampliar plano
            </Button>
          )}
          <Link href="/app/maquinas/nova">
            <Button disabled={!!usage && usage.used >= usage.limit}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Máquina
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="h-10 w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue>
              {statusFilter === 'all' ? 'Todos'
               : statusFilter === 'active' ? 'Ativas'
               : statusFilter === 'inactive' ? 'Inativas'
               : statusFilter === 'maintenance' ? 'Manutenção'
               : 'Status'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Máquinas</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data?.total || 0} máquina(s) cadastrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.machines.length === 0 ? (
            <EmptyStateV2
              illustration="no-machines"
              title="Nada por aqui ainda"
              description="Cadastre sua primeira máquina pra começar a importar vendas, gerar relatórios e atribuir reabastecedores."
              ctaLabel="Cadastrar primeira máquina"
              ctaHref="/app/maquinas/nova"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10">
                          <Monitor className="h-5 w-5 text-brand-navy" strokeWidth={1.75} />
                        </div>
                        <div>
                          <p className="font-medium">{machine.name}</p>
                          <p className="text-xs text-text-tertiary tabular-nums font-mono">{machine.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {machine.location ? (
                        <p className="text-sm">{machine.location.name}</p>
                      ) : (
                        <span className="text-text-tertiary text-sm">Sem local</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Pill tone="outline" size="sm">
                        {typeLabels[machine.machine_type || 'other']}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const stock = stockSummary[machine.id];
                        if (!stock || stock.fill_rate === null) return <span className="text-text-tertiary text-xs">—</span>;
                        const pct = stock.fill_rate;
                        const color = pct >= 50 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-400' : 'bg-red-500';
                        return (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-surface-secondary overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-text-tertiary">{pct}%</span>
                            {stock.critical_slots > 0 && (
                              <span className="text-[10px] text-red-600 font-medium">{stock.critical_slots} crit</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <StatusDot status={machineDbStatusToDot(machine.status)} label />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                          aria-label={`Ações de ${machine.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={`/app/maquinas/${machine.id}`} className="flex items-center gap-2 w-full">
                              <Eye className="h-4 w-4" />Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Link href={`/app/maquinas/${machine.id}/editar`} className="flex items-center gap-2 w-full">
                              <Edit className="h-4 w-4" />Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(machine.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Desativar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de ampliação */}
      <Dialog open={expandOpen} onOpenChange={setExpandOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ampliar plano de máquinas</DialogTitle>
            <DialogDescription>
              Adicione máquinas ao seu plano. A cobrança pro-rata é gerada imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium whitespace-nowrap">Máquinas a adicionar:</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={expandQty}
                onChange={(e) => setExpandQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="w-20 tabular-nums"
              />
            </div>
            {proRata && usage?.price_per_machine && (
              <div className="rounded-lg border border-border-default bg-surface-subtle p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Valor por máquina</span>
                  <span className="tabular-nums">R$ {usage.price_per_machine.toFixed(2)}/mês</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Dias restantes no ciclo</span>
                  <span className="tabular-nums">{proRata.daysRemaining} de {proRata.daysInMonth} dias</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Fator pro-rata</span>
                  <span className="tabular-nums">{(proRata.factor * 100).toFixed(0)}%</span>
                </div>
                <div className="border-t border-border-default pt-2 flex justify-between font-medium">
                  <span>Total desta ampliação</span>
                  <span className="tabular-nums text-brand-amber">R$ {proRata.total.toFixed(2)}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-text-tertiary">
              No próximo ciclo de cobrança (dia {usage?.billing_day ?? 10}), o valor cheio das novas máquinas será incluído na fatura mensal automaticamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpandOpen(false)}>Cancelar</Button>
            <Button onClick={handleExpand} disabled={expanding || !proRata}>
              {expanding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</> : `Confirmar +${expandQty} máquina(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
