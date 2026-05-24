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
  Filter,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import type { Tenant } from '@/types';

const statusConfig = {
  active:    { label: 'Ativo',        className: 'bg-success-soft text-success' },
  trial:     { label: 'Trial',        className: 'bg-brand-amber/15 text-[#92400e] dark:text-brand-amber' },
  overdue:   { label: 'Inadimplente', className: 'bg-warning-soft text-warning' },
  suspended: { label: 'Suspenso',     className: 'bg-danger-soft text-danger' },
  cancelled: { label: 'Cancelado',    className: 'bg-surface-subtle text-text-tertiary' },
};

interface TenantsResponse {
  tenants: (Tenant & { plan?: { name: string; price_per_machine: number } })[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState<TenantsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/tenants?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || 'Erro ao carregar clientes');
      }
    } catch {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchClients, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este cliente?')) return;

    try {
      const response = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast.success('Cliente cancelado com sucesso');
        fetchClients();
      } else {
        toast.error(result.error?.message || 'Erro ao cancelar cliente');
      }
    } catch {
      toast.error('Erro ao cancelar cliente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes da plataforma
          </p>
        </div>
        <Link href="/admin/clientes/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="overdue">Inadimplentes</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data?.total || 0} cliente(s) encontrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.tenants.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              <Link href="/admin/clientes/novo">
                <Button variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar primeiro cliente
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.tenants.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.company_name}</p>
                        <p className="text-xs text-muted-foreground">{client.document_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{client.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{client.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.plan?.name || 'Sem plano'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[client.subscription_status as keyof typeof statusConfig]?.className}>
                        {statusConfig[client.subscription_status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancelar
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
