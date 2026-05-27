'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Search, Filter, Eye, Send, MoreHorizontal, CheckCircle, Clock,
  AlertCircle, XCircle, Plus, Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Invoice {
  id: string;
  invoice_number: string;
  reference_month: string;
  due_date: string;
  total: number;
  status: string;
  paid_at: string | null;
  tenant: { company_name: string; contact_name: string } | null;
}

const STATUS_META = {
  draft:     { label: 'Rascunho',  icon: Clock,       className: 'bg-surface-subtle text-text-secondary' },
  pending:   { label: 'Pendente',  icon: Clock,       className: 'bg-info-soft text-info' },
  paid:      { label: 'Pago',      icon: CheckCircle, className: 'bg-success-soft text-success' },
  overdue:   { label: 'Vencida',   icon: AlertCircle, className: 'bg-danger-soft text-danger' },
  cancelled: { label: 'Cancelada', icon: XCircle,     className: 'bg-surface-subtle text-text-tertiary' },
} as const;

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: '100' });
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    try {
      const res = await fetch(`/api/admin/invoices?${params}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data.invoices);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function resend(id: string, template: 'reminder' | 'overdue' | 'suspension_warning') {
    const res = await fetch(`/api/admin/invoices/${id}/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    });
    const json = await res.json();
    if (json.success) toast.success('Email enviado');
    else toast.error(json.error?.message ?? 'Falha ao enviar');
  }

  // KPIs derivadas da página visível
  const totalAmount = invoices.reduce((acc, i) => acc + Number(i.total), 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + Number(i.total), 0);
  const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((acc, i) => acc + Number(i.total), 0);
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + Number(i.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturas</h1>
          <p className="text-muted-foreground">Gerencie as faturas da plataforma</p>
        </div>
        <Link href="/admin/faturas/manual">
          <Button><Plus className="mr-2 h-4 w-4" />Fatura manual</Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Total na página" value={formatBRL(totalAmount)} hint={`${invoices.length} faturas`} />
        <KpiCard label="Pagas" value={formatBRL(paidAmount)} tone="success" />
        <KpiCard label="Pendentes" value={formatBRL(pendingAmount)} tone="info" />
        <KpiCard label="Vencidas" value={formatBRL(overdueAmount)} tone="danger" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número da fatura…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="h-9 w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue>{statusFilter === 'all' ? 'Todos' : STATUS_META[statusFilter as keyof typeof STATUS_META]?.label}</SelectValue>
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de faturas</CardTitle>
          <CardDescription>{loading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} fatura(s) no total`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma fatura encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => {
                  const meta = STATUS_META[inv.status as keyof typeof STATUS_META] ?? STATUS_META.draft;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <p className="text-sm">{inv.tenant?.company_name ?? '—'}</p>
                        <p className="text-[11px] text-text-tertiary">{inv.tenant?.contact_name ?? ''}</p>
                      </TableCell>
                      <TableCell>{new Date(inv.due_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatBRL(Number(inv.total))}</TableCell>
                      <TableCell>
                        <Badge className={meta.className}>
                          <Icon className="mr-1 h-3 w-3" />{meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon" aria-label="Ações da fatura"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                            {(inv.status === 'pending' || inv.status === 'overdue') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => resend(inv.id, 'reminder')}>
                                  <Send className="mr-2 h-4 w-4" />Reenviar lembrete
                                </DropdownMenuItem>
                                {inv.status === 'overdue' && (
                                  <DropdownMenuItem onClick={() => resend(inv.id, 'overdue')}>
                                    <Send className="mr-2 h-4 w-4" />Cobrar vencida
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => resend(inv.id, 'suspension_warning')}>
                                  <Send className="mr-2 h-4 w-4" />Aviso de suspensão
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'success' | 'info' | 'danger' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'info' ? 'text-info' : tone === 'danger' ? 'text-danger' : '';
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wide text-text-tertiary font-medium">{label}</p>
        <div className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
        {hint && <p className="mt-0.5 text-[11px] text-text-tertiary">{hint}</p>}
      </CardContent>
    </Card>
  );
}
