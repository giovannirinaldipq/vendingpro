'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  MoreHorizontal,
  CreditCard,
  Banknote,
  QrCode,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Dados mockados
const payments = [
  {
    id: '1',
    invoice_number: 'FAT-2026-0001',
    client: 'Vending Solutions Ltda',
    amount: 348.00,
    payment_method: 'pix',
    payment_date: '2026-05-08',
    is_manual: false,
  },
  {
    id: '2',
    invoice_number: 'FAT-2026-0002',
    client: 'Mega Vending Corp',
    amount: 1092.00,
    payment_method: 'boleto',
    payment_date: '2026-05-14',
    is_manual: false,
  },
  {
    id: '3',
    invoice_number: 'FAT-2026-0006',
    client: 'Express Vending',
    amount: 580.00,
    payment_method: 'credit_card',
    payment_date: '2026-05-12',
    is_manual: false,
  },
  {
    id: '4',
    invoice_number: 'FAT-2026-0007',
    client: 'Auto Snacks',
    amount: 290.00,
    payment_method: 'transfer',
    payment_date: '2026-05-10',
    is_manual: true,
  },
];

const paymentMethodConfig = {
  pix:         { label: 'PIX',           icon: QrCode,     className: 'bg-success-soft text-success' },
  boleto:      { label: 'Boleto',        icon: Banknote,   className: 'bg-info-soft text-info' },
  credit_card: { label: 'Cartão',        icon: CreditCard, className: 'bg-brand-navy/10 text-brand-navy' },
  transfer:    { label: 'Transferência', icon: Banknote,   className: 'bg-surface-subtle text-text-secondary' },
};

const stats = [
  { label: 'Recebido Hoje', value: 'R$ 1.440,00', count: '3 pagamentos' },
  { label: 'Recebido na Semana', value: 'R$ 4.850,00', count: '12 pagamentos' },
  { label: 'Recebido no Mês', value: 'R$ 10.560,00', count: '38 pagamentos' },
];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      payment.client.toLowerCase().includes(search.toLowerCase());

    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Histórico de pagamentos recebidos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pagamento Manual</DialogTitle>
              <DialogDescription>
                Registre um pagamento recebido fora do gateway
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoice">Fatura</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">FAT-2026-0003 - Snack Express - R$ 435,00</SelectItem>
                    <SelectItem value="2">FAT-2026-0004 - City Vending - R$ 152,00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Recebido</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data do Pagamento</Label>
                  <Input id="date" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Forma de Pagamento</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input id="notes" placeholder="Observações sobre o pagamento" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Registrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.count}</p>
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
                placeholder="Buscar por fatura ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => v && setMethodFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="credit_card">Cartão</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>
            {filteredPayments.length} pagamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fatura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const method = paymentMethodConfig[payment.payment_method as keyof typeof paymentMethodConfig];
                const MethodIcon = method.icon;

                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.invoice_number}
                    </TableCell>
                    <TableCell>{payment.client}</TableCell>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={method.className}>
                        <MethodIcon className="mr-1 h-3 w-3" />
                        {method.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.is_manual ? 'outline' : 'secondary'}>
                        {payment.is_manual ? 'Manual' : 'Automático'}
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
                            Ver Detalhes
                          </DropdownMenuItem>
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
