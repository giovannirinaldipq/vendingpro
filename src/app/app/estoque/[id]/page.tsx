'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, ShoppingCart, Package, UserCog, Sparkles,
  TrendingUp, TrendingDown, Boxes,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiCard } from '@/components/ui/kpi-card';

interface Movement {
  id: string;
  movement_type: 'sale' | 'restock' | 'manual_adjust' | 'initial' | string;
  quantity: number;
  occurred_at: string;
  source_kind: string | null;
  source_ref: string | null;
  notes: string | null;
  machine?: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
  balance_after: number;
}

interface InventoryDetail {
  id: string;
  product_id: string;
  current_quantity: number;
  minimum_quantity: number;
  last_updated_at: string | null;
  product: { id: string; name: string; barcode?: string; category?: string } | { id: string; name: string; barcode?: string; category?: string }[] | null;
}

const KIND_META: Record<string, { label: string; icon: typeof Package; tone: string }> = {
  sale:          { label: 'Venda',           icon: ShoppingCart, tone: 'bg-danger-soft text-danger' },
  restock:       { label: 'Reposição',       icon: Package,      tone: 'bg-success-soft text-success' },
  manual_adjust: { label: 'Ajuste manual',   icon: UserCog,      tone: 'bg-warning-soft text-warning' },
  initial:       { label: 'Estoque inicial', icon: Sparkles,     tone: 'bg-info-soft text-info' },
};

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function InventoryExtractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [inventory, setInventory] = useState<InventoryDetail | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/app/inventory/${id}/movements`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setInventory(j.data.inventory);
          setMovements(j.data.movements);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!inventory) {
    return <div className="text-center text-muted-foreground py-12">Item de estoque não encontrado.</div>;
  }

  const prod = Array.isArray(inventory.product) ? inventory.product[0] : inventory.product;

  const totalsByKind = movements.reduce<Record<string, number>>((acc, m) => {
    const key = m.movement_type;
    acc[key] = (acc[key] ?? 0) + Math.abs(Number(m.quantity));
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/estoque">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{prod?.name ?? 'Produto'}</h1>
          <p className="text-sm text-muted-foreground">
            Extrato de estoque · {inventory.last_updated_at ? `atualizado em ${formatDateTime(inventory.last_updated_at)}` : 'sem movimentações ainda'}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Estoque atual"
          value={String(inventory.current_quantity)}
          icon={Boxes}
          hint={`mínimo: ${inventory.minimum_quantity ?? 0}`}
        />
        <KpiCard
          label="Vendido (histórico)"
          value={String(totalsByKind.sale ?? 0)}
          icon={ShoppingCart}
        />
        <KpiCard
          label="Reposto (histórico)"
          value={String(totalsByKind.restock ?? 0)}
          icon={Package}
        />
        <KpiCard
          label="Movimentações"
          value={String(movements.length)}
          icon={UserCog}
        />
      </div>

      {/* Extrato */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de movimentações</CardTitle>
          <CardDescription>
            Cada linha é uma movimentação real (venda, reposição ou ajuste). O estoque atual é a soma de tudo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma movimentação registrada ainda.
              Cadastre o estoque inicial em <Link href="/app/estoque" className="text-brand-navy hover:underline">/app/estoque</Link> ou importe vendas em <Link href="/app/importar" className="text-brand-navy hover:underline">/app/importar</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Quando</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => {
                  const meta = KIND_META[m.movement_type] ?? { label: m.movement_type, icon: Package, tone: 'bg-surface-subtle text-text-secondary' };
                  const Icon = meta.icon;
                  const qty = Number(m.quantity);
                  const isPositive = qty >= 0;
                  const machine = Array.isArray(m.machine) ? m.machine[0] : m.machine;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {formatDateTime(m.occurred_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.tone}>
                          <Icon className="mr-1 h-3 w-3" />{meta.label}
                        </Badge>
                        {m.notes && <div className="text-[11px] text-text-tertiary mt-1">{m.notes}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-text-secondary">
                        {machine ? `${machine.name} (${machine.code})` : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-mono tabular-nums font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
                        <span className="inline-flex items-center gap-1 justify-end">
                          {isPositive
                            ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                            : <TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
                          {isPositive ? '+' : '−'}{Math.abs(qty)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-text-primary font-semibold">
                        {m.balance_after}
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
