'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Send,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';

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

// Dados mockados
const invoices = [
  {
    id: '1',
    invoice_number: 'FAT-2026-0001',
    client: 'Vending Solutions Ltda',
    reference_month: '2026-05',
    due_date: '2026-05-10',
    total: 348.00,
    status: 'paid',
    paid_at: '2026-05-08',
  },
  {
    id: '2',
    invoice_number: 'FAT-2026-0002',
    client: 'Mega Vending Corp',
    reference_month: '2026-05',
    due_date: '2026-05-15',
    total: 1092.00,
    status: 'paid',
    paid_at: '2026-05-14',
  },
  {
    id: '3',
    invoice_number: 'FAT-2026-0003',
    client: 'Snack Express',
    reference_month: '2026-05',
    due_date: '2026-05-20',
    total: 435.00,
    status: 'pending',
    paid_at: null,
  },
  {
    id: '4',
    invoice_number: 'FAT-2026-0004',
    client: 'City Vending',
    reference_month: '2026-05',
    due_date: '2026-05-10',
    total: 152.00,
    status: 'overdue',
    paid_at: null,
  },
  {
    id: '5',
    invoice_number: 'FAT-2026-0005',
    client: 'Quick Snacks ME',
    reference_month: '2026-05',
    due_date: '2026-05-25',
    total: 99.00,
    status: 'draft',
    paid_at: null,
  },
];

const statusConfig = {
  draft: {
    label: 'Rascunho',
    icon: Clock,
    className: 'bg-surface-subtle text-text-secondary',
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-info-soft text-info',
  },
  paid: {
    label: 'Pago',
    icon: CheckCircle,
    className: 'bg-success-soft text-success',
  },
  overdue: {
    label: 'Vencida',
    icon: AlertCircle,
    className: 'bg-danger-soft text-danger',
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    className: 'bg-surface-subtle text-text-tertiary',
  },
};

const stats = [
  { label: 'Total Faturado', value: 'R$ 12.450,00', description: 'Este mês' },
  { label: 'Recebido', value: 'R$ 10.560,00', description: '84.8%' },
  { label: 'Pendente', value: 'R$ 1.890,00', description: '4 faturas' },
  { label: 'Vencido', value: 'R$ 580,00', description: '2 faturas' },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.client.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
        <p className="text-muted-foreground">
          Gerencie as faturas dos clientes
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
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
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Faturas</CardTitle>
          <CardDescription>
            {filteredInvoices.length} fatura(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{invoice.client}</TableCell>
                    <TableCell>
                      {new Date(invoice.reference_month + '-01').toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {status.label}
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
                            <Download className="mr-2 h-4 w-4" />
                            Baixar PDF
                          </DropdownMenuItem>
                          {invoice.status === 'pending' && (
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Reenviar
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-success">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Registrar Pagamento
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
