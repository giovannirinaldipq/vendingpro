'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Machine {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance' | 'deactivated';
  status_reason?: string;
  status_changed_at?: string;
  location_id?: string;
  location?: {
    id: string;
    name: string;
    address?: string;
  };
  created_at: string;
}

interface Sale {
  id: string;
  sale_date: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method?: string;
}

interface MachineStats {
  total_revenue: number;
  total_sales: number;
  average_ticket: number;
  top_products: Array<{ name: string; count: number; revenue: number }>;
}

const statusConfig = {
  active:      { label: 'Ativa',       color: 'bg-success-soft text-success',  icon: CheckCircle },
  inactive:    { label: 'Inativa',     color: 'bg-surface-subtle text-text-tertiary', icon: XCircle },
  maintenance: { label: 'Manutenção',  color: 'bg-warning-soft text-warning',  icon: Wrench },
  deactivated: { label: 'Desativada',  color: 'bg-danger-soft text-danger',    icon: AlertTriangle },
};

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<MachineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar dados da máquina
        const machineRes = await fetch(`/api/app/machines/${id}`);
        const machineResult = await machineRes.json();

        if (!machineResult.success) {
          toast.error('Máquina não encontrada');
          router.push('/app/maquinas');
          return;
        }

        setMachine(machineResult.data);

        // Buscar vendas recentes (últimos 30 dias)
        const salesRes = await fetch(`/api/app/machines/${id}/sales?limit=20`);
        const salesResult = await salesRes.json();
        if (salesResult.success) {
          setSales(salesResult.data.sales || []);
          setStats(salesResult.data.stats || null);
        }
      } catch {
        toast.error('Erro ao carregar dados da máquina');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, router]);

  async function handleStatusChange(newStatus: string | null) {
    if (!machine || !newStatus || newStatus === machine.status) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/app/machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setMachine({ ...machine, status: newStatus as Machine['status'] });
        toast.success('Status atualizado com sucesso!');
      } else {
        toast.error(result.error?.message || 'Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/app/machines/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Máquina desativada com sucesso!');
        router.push('/app/maquinas');
      } else {
        toast.error(result.error?.message || 'Erro ao desativar máquina');
      }
    } catch {
      toast.error('Erro ao desativar máquina');
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!machine) {
    return null;
  }

  const StatusIcon = statusConfig[machine.status]?.icon || CheckCircle;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/maquinas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{machine.code}</h1>
              <Badge className={statusConfig[machine.status]?.color}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusConfig[machine.status]?.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{machine.name}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/app/maquinas/${id}/produtos`}>
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Produtos
            </Button>
          </Link>
          <Link href={`/app/maquinas/${id}/editar`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Desativar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar máquina?</AlertDialogTitle>
                <AlertDialogDescription>
                  A máquina será marcada como desativada e não aparecerá mais nas listagens.
                  Os dados de vendas serão mantidos para histórico.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-danger hover:bg-danger/90">
                  Desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita (30 dias)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas (30 dias)
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.total_sales || 0).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Localização
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium truncate">
              {machine.location?.name || 'Sem local'}
            </div>
            {machine.location?.address && (
              <p className="text-xs text-muted-foreground truncate">{machine.location.address}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status e Detalhes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
            <CardDescription>Detalhes da máquina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-medium">{machine.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{machine.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cadastrada em</p>
                <p className="font-medium">
                  {new Date(machine.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última alteração de status</p>
                <p className="font-medium">
                  {machine.status_changed_at
                    ? new Date(machine.status_changed_at).toLocaleDateString('pt-BR')
                    : '-'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Alterar Status</p>
              <Select
                value={machine.status}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {statusConfig[machine.status]?.label ?? machine.status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="maintenance">Em Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
            <CardDescription>Produtos mais vendidos nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.top_products && stats.top_products.length > 0 ? (
              <div className="space-y-3">
                {stats.top_products.slice(0, 5).map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {product.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">{product.count} vendas</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Sem dados de vendas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendas Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
          <CardDescription>Últimas 20 vendas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sale.product_name}</TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell className="text-right">
                      R$ {sale.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {sale.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sale.payment_method || 'N/A'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nenhuma venda registrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
