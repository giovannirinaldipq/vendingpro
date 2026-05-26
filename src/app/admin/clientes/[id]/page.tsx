'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit, Eye, Pause, Play, XCircle, Loader2,
  Mail, Phone, FileText, Building2, Calendar, Users as UsersIcon,
  Package, ShoppingCart, AlertTriangle, CheckCircle2, Clock, History,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Tenant {
  id: string;
  company_name: string;
  trade_name: string | null;
  document_type: string;
  document_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  financial_email: string | null;
  financial_phone: string | null;
  address_city: string | null;
  address_state: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  suspended_at: string | null;
  cancelled_at: string | null;
  reactivated_at: string | null;
  status_change_reason: string | null;
  billing_day: number | null;
  contracted_machines: number | null;
  created_at: string;
  plan?: { name: string; price_per_machine: number } | null;
}

interface Metrics {
  tenant: { id: string; company_name: string; subscription_status: string; trial_ends_at: string | null; created_at: string };
  counts: { machines: number; active_machines: number; users: number; restockers: number; products: number; sales: number };
  revenue: { total: number; last_30d: number };
  billing: { open_count: number; open_total: number; paid_count: number; paid_total: number; overdue_count: number; overdue_total: number };
  last_user_login: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  created_at: string;
  admin: { id: string; name: string; email: string; role: string } | null;
}

const STATUS_META = {
  active:    { label: 'Ativo',        className: 'bg-success-soft text-success' },
  trial:     { label: 'Trial',        className: 'bg-brand-amber/15 text-[#92400e] dark:text-brand-amber' },
  overdue:   { label: 'Inadimplente', className: 'bg-warning-soft text-warning' },
  suspended: { label: 'Suspenso',     className: 'bg-danger-soft text-danger' },
  cancelled: { label: 'Cancelado',    className: 'bg-surface-subtle text-text-tertiary' },
} as const;

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(s: string) {
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/admin/tenants/${id}`).then(r => r.json()),
        fetch(`/api/admin/tenants/${id}/metrics`).then(r => r.json()),
      ]);
      if (tRes.success) setTenant(tRes.data);
      if (mRes.success) setMetrics(mRes.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!tenant) {
    return <div className="flex h-96 items-center justify-center text-text-tertiary">Cliente não encontrado</div>;
  }

  const statusMeta = STATUS_META[tenant.subscription_status as keyof typeof STATUS_META] ?? STATUS_META.cancelled;
  const isSuspended = tenant.subscription_status === 'suspended';
  const isCancelled = tenant.subscription_status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/admin/clientes">
            <Button variant="ghost" size="icon" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{tenant.company_name}</h1>
              <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {tenant.document_number} · {tenant.address_city ? `${tenant.address_city}/${tenant.address_state ?? '—'}` : 'sem endereço'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImpersonateButton tenantId={tenant.id} tenantName={tenant.company_name} />
          <Link href={`/admin/clientes/${tenant.id}/editar`}>
            <Button variant="outline" size="sm"><Edit className="mr-2 h-3.5 w-3.5" />Editar</Button>
          </Link>
          {isSuspended || isCancelled ? (
            <ReactivateButton tenantId={tenant.id} onDone={loadAll} />
          ) : (
            <SuspendButton tenantId={tenant.id} onDone={loadAll} />
          )}
          {!isCancelled && <CancelButton tenantId={tenant.id} onDone={() => { loadAll(); router.refresh(); }} />}
        </div>
      </div>

      {/* KPIs */}
      {metrics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiMini icon={Package} label="Máquinas" value={`${metrics.counts.active_machines}/${metrics.counts.machines}`} hint="ativas / total" />
          <KpiMini icon={UsersIcon} label="Usuários" value={String(metrics.counts.users)} hint="ativos" />
          <KpiMini icon={ShoppingCart} label="Vendas 30d" value={formatBRL(metrics.revenue.last_30d)} hint={`${metrics.counts.sales} no total`} />
          <KpiMini
            icon={AlertTriangle}
            label="Faturas em aberto"
            value={formatBRL(metrics.billing.open_total)}
            hint={`${metrics.billing.open_count} abertas · ${metrics.billing.overdue_count} vencidas`}
            tone={metrics.billing.overdue_count > 0 ? 'danger' : 'default'}
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Dados da empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Razão social" value={tenant.company_name} />
                {tenant.trade_name && <InfoRow label="Nome fantasia" value={tenant.trade_name} />}
                <InfoRow label="Documento" value={`${tenant.document_type.toUpperCase()} ${tenant.document_number}`} />
                <InfoRow label="Plano" value={tenant.plan?.name ?? 'Sem plano'} />
                <InfoRow label="Máquinas contratadas" value={String(tenant.contracted_machines ?? 5)} />
                <InfoRow label="Dia de cobrança" value={tenant.billing_day ? `Dia ${tenant.billing_day}` : '—'} />
                <InfoRow label="Cliente desde" value={formatDate(tenant.created_at)} />
                {tenant.trial_ends_at && tenant.subscription_status === 'trial' && (
                  <InfoRow label="Trial até" value={formatDate(tenant.trial_ends_at)} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Responsável" value={tenant.contact_name} />
                <InfoRow label="Email" value={tenant.contact_email} mono />
                {tenant.contact_phone && <InfoRow label="Telefone" value={tenant.contact_phone} mono />}
                {tenant.financial_email && <InfoRow label="Email financeiro" value={tenant.financial_email} mono />}
                {tenant.financial_phone && <InfoRow label="Telefone financeiro" value={tenant.financial_phone} mono />}
              </CardContent>
            </Card>

            {(isSuspended || isCancelled || tenant.status_change_reason) && (
              <Card className="lg:col-span-2 border-warning/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-warning">
                    {isCancelled ? <XCircle className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isCancelled ? 'Cancelamento' : isSuspended ? 'Suspensão' : 'Última mudança de status'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {tenant.status_change_reason && <InfoRow label="Motivo" value={tenant.status_change_reason} />}
                  {isSuspended && tenant.suspended_at && <InfoRow label="Suspenso em" value={formatDate(tenant.suspended_at)} />}
                  {isCancelled && tenant.cancelled_at && <InfoRow label="Cancelado em" value={formatDate(tenant.cancelled_at)} />}
                  {tenant.reactivated_at && <InfoRow label="Última reativação" value={formatDate(tenant.reactivated_at)} />}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UsersTab tenantId={tenant.id} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab tenantId={tenant.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab tenantId={tenant.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono text-xs tabular-nums text-right' : 'text-right font-medium'}>{value}</span>
    </div>
  );
}

function KpiMini({ icon: Icon, label, value, hint, tone = 'default' }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-text-tertiary font-medium">{label}</span>
          <Icon className={`h-3.5 w-3.5 ${tone === 'danger' ? 'text-danger' : 'text-muted-foreground'}`} strokeWidth={2} />
        </div>
        <div className={`mt-1 text-xl font-bold tabular-nums ${tone === 'danger' ? 'text-danger' : ''}`}>{value}</div>
        {hint && <p className="mt-0.5 text-[11px] text-text-tertiary">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// --- Ações de status -------------------------------------------------------

function SuspendButton({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error('Informe o motivo da suspensão');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notify_email: notify }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Cliente suspenso');
        setOpen(false);
        setReason('');
        onDone();
      } else {
        toast.error(json.error?.message ?? 'Falha ao suspender');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Pause className="mr-2 h-3.5 w-3.5" />Suspender</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspender cliente</DialogTitle>
          <DialogDescription>
            O cliente fica bloqueado em <code>/app</code>, mas os dados são preservados. Pode ser reativado depois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reason">Motivo *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: 30 dias em atraso sem retorno"
              rows={3}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Enviar email avisando o cliente
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Suspender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReactivateButton({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [newStatus, setNewStatus] = useState<'active' | 'trial'>('active');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined, new_status: newStatus, notify_email: notify }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Cliente reativado');
        setOpen(false);
        onDone();
      } else {
        toast.error(json.error?.message ?? 'Falha ao reativar');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Play className="mr-2 h-3.5 w-3.5" />Reativar</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reativar cliente</DialogTitle>
          <DialogDescription>O cliente volta a acessar a plataforma imediatamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Novo status</Label>
            <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v as 'active' | 'trial')}>
              <SelectTrigger><SelectValue>{newStatus === 'active' ? 'Ativo' : 'Trial'}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reactivate-reason">Motivo (opcional)</Label>
            <Input id="reactivate-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pagamento recebido" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Enviar email avisando o cliente
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Reativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelButton({ tenantId, onDone }: { tenantId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    if (confirm !== 'CANCELAR') {
      toast.error('Digite CANCELAR para confirmar');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Cliente cancelado');
        setOpen(false);
        onDone();
      } else {
        toast.error(json.error?.message ?? 'Falha ao cancelar');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-danger hover:text-danger"><XCircle className="mr-2 h-3.5 w-3.5" />Cancelar</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-danger">Cancelar cliente</DialogTitle>
          <DialogDescription>
            Ação destrutiva — perde o acesso e o histórico do trial. Use só quando a parceria realmente encerrou.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cancel-reason">Motivo *</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: Cliente pediu cancelamento por email em 14/05"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="cancel-confirm">Digite <code className="font-mono">CANCELAR</code> para confirmar</Label>
            <Input id="cancel-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Voltar</Button>
          <Button onClick={submit} disabled={loading} className="bg-danger text-white hover:bg-danger/90">
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Cancelar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImpersonateButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Entrando como ${tenantName}…`);
        router.push(json.data?.redirect_to ?? '/app');
        router.refresh();
      } else {
        toast.error(json.error?.message ?? 'Falha ao iniciar impersonação');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Eye className="mr-2 h-3.5 w-3.5" />Entrar como cliente</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Visualizar como {tenantName}</DialogTitle>
          <DialogDescription>
            Você vai navegar no <code>/app</code> como se fosse esse cliente. Toda ação fica registrada na auditoria. Sessão expira em 2h.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="imp-reason">Motivo (recomendado)</Label>
            <Input
              id="imp-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: Cliente reportou erro no Dashboard"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Entrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Aba: Usuários ---------------------------------------------------------

interface TenantUser {
  id: string; name: string; email: string; role: string; is_active: boolean;
  last_login_at: string | null; email_verified_at: string | null; created_at: string;
  phone: string | null;
}

function UsersTab({ tenantId }: { tenantId: string }) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/tenants/${tenantId}/users`)
      .then(r => r.json())
      .then(j => { if (j.success) setUsers(j.data); })
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usuários do cliente</CardTitle>
        <CardDescription>{users.length} usuário(s)</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{u.role}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.last_login_at ? formatDateTime(u.last_login_at) : '—'}</TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" />Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                        <XCircle className="h-3 w-3" />Inativo
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// --- Aba: Faturas ----------------------------------------------------------

interface TenantInvoice {
  id: string; invoice_number: string; reference_month: string; due_date: string;
  total: number; status: string; paid_at: string | null;
  gateway_boleto_url: string | null;
}

const INVOICE_STATUS_META = {
  draft:     { label: 'Rascunho',  className: 'bg-surface-subtle text-text-secondary' },
  pending:   { label: 'Pendente',  className: 'bg-info-soft text-info' },
  paid:      { label: 'Pago',      className: 'bg-success-soft text-success' },
  overdue:   { label: 'Vencida',   className: 'bg-danger-soft text-danger' },
  cancelled: { label: 'Cancelada', className: 'bg-surface-subtle text-text-tertiary' },
} as const;

function InvoicesTab({ tenantId }: { tenantId: string }) {
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/tenants/${tenantId}/invoices`)
      .then(r => r.json())
      .then(j => { if (j.success) setInvoices(j.data); })
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  async function resend(id: string, template: 'reminder' | 'overdue' | 'suspension_warning') {
    const res = await fetch(`/api/admin/invoices/${id}/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    });
    const json = await res.json();
    if (json.success) toast.success('Email enviado');
    else toast.error(json.error?.message ?? 'Falha ao reenviar');
  }

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Faturas</CardTitle>
          <CardDescription>{invoices.length} fatura(s) recentes</CardDescription>
        </div>
        <Link href={`/admin/faturas/manual?tenant_id=${tenantId}`}>
          <Button size="sm" variant="outline"><FileText className="mr-2 h-3.5 w-3.5" />Gerar fatura manual</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fatura emitida ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => {
                const meta = INVOICE_STATUS_META[inv.status as keyof typeof INVOICE_STATUS_META] ?? INVOICE_STATUS_META.draft;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatBRL(Number(inv.total))}</TableCell>
                    <TableCell><Badge className={meta.className}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resend(inv.id, inv.status === 'overdue' ? 'overdue' : 'reminder')}
                        >
                          <Send className="mr-1.5 h-3 w-3" />Reenviar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// --- Aba: Atividade --------------------------------------------------------

function ActivityTab({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/audit-logs?entity_id=${tenantId}&per_page=100`)
      .then(r => r.json())
      .then(j => { if (j.success) setLogs(j.data.logs); })
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Histórico de ações administrativas</CardTitle>
        <CardDescription>Tudo que admins fizeram sobre esse cliente</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {logs.map(log => (
              <li key={log.id} className="flex gap-3 text-sm">
                <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-brand-amber" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium">{prettyAction(log.action)}</span>
                    <span className="text-xs text-muted-foreground">por {log.admin?.name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                    <Clock className="h-3 w-3" />{formatDateTime(log.created_at)}
                  </div>
                  {log.new_values && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {summarizeValues(log.new_values)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function prettyAction(action: string): string {
  const map: Record<string, string> = {
    'tenant.created':           'Cliente cadastrado',
    'tenant.updated':           'Dados atualizados',
    'tenant.suspended':         'Cliente suspenso',
    'tenant.reactivated':       'Cliente reativado',
    'tenant.cancelled':         'Cliente cancelado',
    'tenant.impersonate_start': 'Impersonação iniciada',
    'tenant.impersonate_end':   'Impersonação encerrada',
    'invoice.created_manual':   'Fatura manual gerada',
    'invoice.resent':           'Cobrança reenviada',
  };
  return map[action] ?? action;
}

function summarizeValues(v: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    if (val === null || val === undefined || val === '') continue;
    if (k === 'session_id') continue;
    parts.push(`${k}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`);
  }
  return parts.slice(0, 3).join(' · ');
}
