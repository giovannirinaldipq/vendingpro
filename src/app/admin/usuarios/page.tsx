'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ROLE_LABELS, type AdminRole } from '@/lib/admin/roles';

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_BADGE: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  financial: 'bg-blue-100 text-blue-700',
  support: 'bg-emerald-100 text-emerald-700',
  commercial: 'bg-amber-100 text-amber-700',
};

export default function UsuariosAdminPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (res.ok) setRows(json.data ?? []);
      else toast.error(json.error ?? 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(row: AdminUserRow) {
    setUpdating(row.id);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      if (res.ok) {
        toast.success(row.is_active ? 'Usuário desativado' : 'Usuário ativado');
        await load();
      } else {
        const json = await res.json();
        toast.error(json.error ?? 'Falha ao atualizar');
      }
    } finally {
      setUpdating(null);
    }
  }

  async function changeRole(row: AdminUserRow, role: AdminRole) {
    setUpdating(row.id);
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        toast.success('Permissão atualizada');
        await load();
      } else {
        const json = await res.json();
        toast.error(json.error ?? 'Falha ao atualizar');
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários do backoffice</h1>
          <p className="text-sm text-muted-foreground">
            Quem pode acessar o admin e quais permissões cada um tem.
          </p>
        </div>
        <Link href="/admin/usuarios/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Novo usuário
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>{rows.length} usuário{rows.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email}</TableCell>
                    <TableCell>
                      <Select
                        value={row.role}
                        onValueChange={v => changeRole(row, v as AdminRole)}
                        disabled={updating === row.id}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue>
                            <Badge className={ROLE_BADGE[row.role]} variant="secondary">
                              {ROLE_LABELS[row.role]}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as AdminRole[]).map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {row.is_active
                        ? <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                        : <Badge className="bg-gray-200 text-gray-700">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.last_login_at ? new Date(row.last_login_at).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(row)}
                        disabled={updating === row.id}
                      >
                        {row.is_active
                          ? <><ShieldOff className="mr-1 h-3 w-3" />Desativar</>
                          : <><ShieldCheck className="mr-1 h-3 w-3" />Ativar</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum usuário cadastrado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
