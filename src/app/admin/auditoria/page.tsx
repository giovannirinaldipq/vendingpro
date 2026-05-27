'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2, History, ExternalLink } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin: { id: string; name: string; email: string; role: string } | null;
}

const ACTION_GROUPS = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'tenant.', label: 'Clientes' },
  { value: 'invoice.', label: 'Faturas' },
  { value: 'admin_user.', label: 'Admins' },
  { value: 'plan.', label: 'Planos' },
] as const;

const ACTION_LABELS: Record<string, string> = {
  'tenant.created':           'Cliente cadastrado',
  'tenant.updated':           'Dados atualizados',
  'tenant.suspended':         'Cliente suspenso',
  'tenant.reactivated':       'Cliente reativado',
  'tenant.cancelled':         'Cliente cancelado',
  'tenant.impersonate_start': 'Impersonação iniciada',
  'tenant.impersonate_end':   'Impersonação encerrada',
  'invoice.created_manual':   'Fatura manual gerada',
  'invoice.resent':           'Cobrança reenviada',
  'admin_user.created':       'Admin criado',
};

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (filterGroup !== 'all') params.set('action', filterGroup);
    if (search.trim()) params.set('action', search.trim());
    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filterGroup, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <History className="h-5 w-5" />
          Auditoria
        </h1>
        <p className="text-muted-foreground">
          Histórico completo das ações administrativas. Imutável.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ação (ex.: tenant.suspended)…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pl-9"
          />
        </div>
        <Select value={filterGroup} onValueChange={(v) => { if (v) { setFilterGroup(v); setPage(1); } }}>
          <SelectTrigger className="h-9 w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue>{ACTION_GROUPS.find(g => g.value === filterGroup)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ACTION_GROUPS.map(g => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Eventos</CardTitle>
            <CardDescription>{total.toLocaleString('pt-BR')} evento(s) · página {page} de {totalPages}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Próxima página" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.admin ? (
                        <div>
                          <p className="text-sm font-medium">{log.admin.name}</p>
                          <p className="text-[11px] text-text-tertiary">{log.admin.role}</p>
                        </div>
                      ) : <span className="text-text-tertiary">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-text-tertiary max-w-[200px] truncate">
                      {log.entity_type ?? '—'}
                      {log.entity_id && (
                        entityHref(log.entity_type, log.entity_id) ? (
                          <Link
                            href={entityHref(log.entity_type, log.entity_id) as string}
                            className="block text-brand-navy hover:underline inline-flex items-center gap-1"
                          >
                            {log.entity_id.slice(0, 8)}…<ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        ) : (
                          <span className="block">{log.entity_id.slice(0, 8)}…</span>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {summarizeValues(log.new_values)}
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

function entityHref(entityType: string | null, entityId: string): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'tenants':            return `/admin/clientes/${entityId}`;
    case 'billing.invoices':   return `/admin/faturas`;
    case 'billing.payments':   return `/admin/pagamentos`;
    case 'billing.plans':      return `/admin/planos`;
    case 'admin.users':        return `/admin/usuarios`;
    default:                   return null;
  }
}

function summarizeValues(v: Record<string, unknown> | null): string {
  if (!v) return '—';
  const parts: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    if (val === null || val === undefined || val === '') continue;
    if (k === 'session_id') continue;
    parts.push(`${k}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`);
  }
  return parts.slice(0, 3).join(' · ') || '—';
}
