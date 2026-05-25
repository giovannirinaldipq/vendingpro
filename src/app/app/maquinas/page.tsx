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
        <Link href="/app/maquinas/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Máquina
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

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
    </div>
  );
}
