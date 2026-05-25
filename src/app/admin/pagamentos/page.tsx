'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search, Filter, Plus, Eye, MoreHorizontal, CreditCard, Banknote, QrCode,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  is_manual: boolean;
  notes: string | null;
  created_at: string;
  invoice: { invoice_number: string } | null;
  tenant: { company_name: string } | null;
}

interface PendingInvoice {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string;
  tenant: { company_name: string } | null;
}

interface Stats {
  today: { total: number; count: number };
  week: { total: number; count: number };
  month: { total: number; count: number };
}

const METHOD_META: Record<string, { label: string; icon: typeof QrCode; className: string }> = {
  pix:         { label: 'PIX',           icon: QrCode,     className: 'bg-success-soft text-success' },
  boleto:      { label: 'Boleto',        icon: Banknote,   className: 'bg-info-soft text-info' },
  credit_card: { label: 'Cartão',        icon: CreditCard, className: 'bg-brand-navy/10 text-brand-navy' },
  transfer:    { label: 'Transferência', icon: Banknote,   className: 'bg-surface-subtle text-text-secondary' },
  cash:        { label: 'Dinheiro',      icon: Banknote,   className: 'bg-surface-subtle text-text-secondary' },
  other:       { label: 'Outro',         icon: Banknote,   className: 'bg-surface-subtle text-text-secondary' },
};

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: '100' });
    if (methodFilter !== 'all') params.set('method', methodFilter);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/admin/payments?${params}`).then(r => r.json()),
        fetch('/api/admin/payments/stats').then(r => r.json()),
      ]);
      if (pRes.success) setPayments(pRes.data.payments);
      if (sRes.success) setStats(sRes.data);
    } finally {
      setLoading(false);
    }
  }, [methodFilter]);

  useEffect(() => { load(); }, [load]);

  // Carrega faturas em aberto pro dialog
  useEffect(() => {
    if (!dialogOpen) return;
    fetch('/api/admin/invoices?status=pending&per_page=200')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setPendingInvoices(j.data.invoices.map((i: PendingInvoice) => ({
            id: i.id, invoice_number: i.invoice_number, total: i.total, due_date: i.due_date, tenant: i.tenant,
          })));
        }
      });
  }, [dialogOpen]);

  const filtered = payments.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (p.invoice?.invoice_number ?? '').toLowerCase().includes(s) ||
      (p.tenant?.company_name ?? '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">Histórico de pagamentos recebidos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Registrar pagamento</Button>} />
          <RegisterPaymentDialog
            invoices={pendingInvoices}
            onDone={() => { setDialogOpen(false); load(); }}
            onCancel={() => setDialogOpen(false)}
          />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Recebido hoje" value={stats ? fmtBRL(stats.today.total) : '—'} count={stats?.today.count} loading={!stats} />
        <StatCard label="Recebido na semana" value={stats ? fmtBRL(stats.week.total) : '—'} count={stats?.week.count} loading={!stats} />
        <StatCard label="Recebido no mês" value={stats ? fmtBRL(stats.month.total) : '—'} count={stats?.month.count} loading={!stats} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por fatura ou cliente…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => v && setMethodFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue>{methodFilter === 'all' ? 'Todos métodos' : METHOD_META[methodFilter]?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="credit_card">Cartão</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>{loading ? 'Carregando…' : `${filtered.length} pagamento(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum pagamento registrado ainda.</p>
          ) : (
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
                {filtered.map(p => {
                  const meta = METHOD_META[p.payment_method] ?? METHOD_META.other;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.invoice?.invoice_number ?? '—'}</TableCell>
                      <TableCell>{p.tenant?.company_name ?? '—'}</TableCell>
                      <TableCell>{new Date(p.payment_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge className={meta.className}><Icon className="mr-1 h-3 w-3" />{meta.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{fmtBRL(Number(p.amount))}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_manual ? 'outline' : 'secondary'}>{p.is_manual ? 'Manual' : 'Automático'}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Ver detalhes</DropdownMenuItem>
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

function StatCard({ label, value, count, loading }: { label: string; value: string; count?: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-32 animate-pulse bg-surface-subtle rounded" />
            <div className="h-3 w-20 animate-pulse bg-surface-subtle rounded" />
          </div>
        ) : (
          <>
            <div className="font-mono text-2xl font-bold tabular-nums">{value}</div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{count != null ? `${count} pagamento(s)` : ''}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RegisterPaymentDialog({
  invoices, onDone, onCancel,
}: { invoices: PendingInvoice[]; onDone: () => void; onCancel: () => void }) {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedInvoice = invoices.find(i => i.id === invoiceId);

  useEffect(() => {
    if (selectedInvoice && !amount) setAmount(String(selectedInvoice.total));
  }, [selectedInvoice, amount]);

  async function submit() {
    if (!invoiceId) { toast.error('Selecione a fatura'); return; }
    if (!amount || Number(amount) <= 0) { toast.error('Valor inválido'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          amount: Number(amount),
          payment_method: method,
          payment_date: paymentDate,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Pagamento registrado');
        onDone();
      } else {
        toast.error(json.error?.message ?? 'Falha ao registrar');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Registrar pagamento manual</DialogTitle>
        <DialogDescription>Registre um pagamento recebido fora do gateway (PIX manual, transferência, etc.).</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Fatura *</Label>
          <Select value={invoiceId} onValueChange={(v) => v && setInvoiceId(v)}>
            <SelectTrigger>
              <SelectValue>
                {selectedInvoice
                  ? `${selectedInvoice.invoice_number} · ${selectedInvoice.tenant?.company_name ?? '—'} · ${fmtBRL(Number(selectedInvoice.total))}`
                  : 'Selecione a fatura em aberto'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {invoices.length === 0 ? (
                <SelectItem value="__none__" disabled>Nenhuma fatura pendente</SelectItem>
              ) : invoices.map(i => (
                <SelectItem key={i.id} value={i.id}>
                  {i.invoice_number} · {i.tenant?.company_name ?? '—'} · {fmtBRL(Number(i.total))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="pay-amount">Valor recebido *</Label>
            <Input id="pay-amount" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pay-date">Data do pagamento *</Label>
            <Input id="pay-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Método</Label>
          <Select value={method} onValueChange={(v) => v && setMethod(v)}>
            <SelectTrigger><SelectValue>{METHOD_META[method]?.label ?? method}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="credit_card">Cartão</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pay-notes">Observações</Label>
          <Textarea id="pay-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Comprovante #123, etc." rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Registrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
