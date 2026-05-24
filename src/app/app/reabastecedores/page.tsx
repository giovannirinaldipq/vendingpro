'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, User, Phone, Car } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Restocker {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  is_active: boolean;
  created_at: string;
}

export default function RestockersPage() {
  const [rows, setRows] = useState<Restocker[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/app/restockers');
      const json = await res.json();
      if (res.ok) setRows(json.data ?? []);
      else toast.error(json.error ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reabastecedores</h1>
          <p className="text-sm text-muted-foreground">Equipe que abastece suas máquinas.</p>
        </div>
        <Link href="/app/reabastecedores/novo">
          <Button><Plus className="mr-2 h-4 w-4" />Novo reabastecedor</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>{rows.length} pessoa{rows.length === 1 ? '' : 's'} cadastrada{rows.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <EmptyStateV2
              illustration="no-machines"
              title="Sua equipe ainda não está cadastrada"
              description="Cadastre reabastecedores pra atribuir máquinas, mandar convites por email e acompanhar visitas com foto antes/depois."
              ctaLabel="Cadastrar primeiro reabastecedor"
              ctaHref="/app/reabastecedores/novo"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</div>}
                      {r.email && <div className="text-xs">{r.email}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.vehicle_plate ? (
                        <div className="flex items-center gap-1"><Car className="h-3 w-3" />{r.vehicle_plate}{r.vehicle_model ? ` · ${r.vehicle_model}` : ''}</div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {r.is_active
                        ? <Badge className="bg-success-soft text-success">Ativo</Badge>
                        : <Badge className="bg-gray-200 text-gray-700">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/app/reabastecedores/${r.id}`}>
                        <Button variant="ghost" size="sm">Editar</Button>
                      </Link>
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
