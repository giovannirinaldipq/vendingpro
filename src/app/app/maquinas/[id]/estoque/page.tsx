'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Package, AlertTriangle, ClipboardCheck, TrendingDown,
  PackagePlus, ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Pill } from '@/components/ui/pill';
import { KpiCard } from '@/components/ui/kpi-card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface InventoryItem {
  product_id: string;
  product: { id: string; name: string; category: string | null; unit_size: string | null } | null;
  slot_code: string | null;
  max_capacity: number | null;
  current_quantity: number;
  fill_level: number | null;
  last_updated_at: string | null;
}

interface Summary {
  total_items: number;
  total_capacity: number;
  fill_rate: number | null;
  critical_slots: number;
  total_slots: number;
}

interface Movement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  occurred_at: string;
  notes: string | null;
  source_kind: string | null;
  product: { name: string } | null;
}

interface MachineInfo {
  id: string;
  code: string;
  name: string;
}

function FillBar({ level }: { level: number | null }) {
  if (level === null) return <span className="text-xs text-text-tertiary">—</span>;
  const pct = Math.round(level * 100);
  const color = pct >= 50 ? 'bg-emerald-500' : pct >= 20 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-surface-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-text-tertiary">{pct}%</span>
    </div>
  );
}

const KIND_LABELS: Record<string, { label: string; tone: string }> = {
  sale: { label: 'Venda', tone: 'danger' },
  restock: { label: 'Reposição', tone: 'success' },
  manual_adjust: { label: 'Ajuste', tone: 'amber' },
  initial: { label: 'Inicial', tone: 'info' },
};

export default function MachineStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovements, setShowMovements] = useState(false);

  // Adjust dialog
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [countedQty, setCountedQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Restock dialog
  const [showRestock, setShowRestock] = useState(false);
  const [restockDrafts, setRestockDrafts] = useState<Record<string, number>>({});
  const [restockNotes, setRestockNotes] = useState('');
  const [restocking, setRestocking] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [machineRes, invRes] = await Promise.all([
        fetch(`/api/app/machines/${id}`),
        fetch(`/api/app/machines/${id}/inventory`),
      ]);
      const machineJson = await machineRes.json();
      const invJson = await invRes.json();

      if (machineJson.success) setMachine(machineJson.data);
      if (invJson.success) {
        setItems(invJson.data.items);
        setSummary(invJson.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function loadMovements() {
    if (movements.length > 0) {
      setShowMovements(!showMovements);
      return;
    }
    const res = await fetch(`/api/app/machines/${id}/inventory/movements?limit=30`);
    const json = await res.json();
    if (json.success) {
      setMovements(json.data.movements);
      setShowMovements(true);
    }
  }

  function openAdjust(item: InventoryItem) {
    setAdjustItem(item);
    setCountedQty(String(item.current_quantity));
    setAdjustNotes('');
  }

  function openRestock() {
    const drafts: Record<string, number> = {};
    for (const item of items) {
      if (item.max_capacity !== null) {
        const toFill = Math.max(0, item.max_capacity - item.current_quantity);
        if (toFill > 0) drafts[item.product_id] = toFill;
      }
    }
    setRestockDrafts(drafts);
    setRestockNotes('');
    setShowRestock(true);
  }

  async function submitRestock() {
    const entries = Object.entries(restockDrafts).filter(([, qty]) => qty > 0);
    if (entries.length === 0) { toast.error('Informe ao menos 1 produto'); return; }
    setRestocking(true);
    try {
      const res = await fetch(`/api/app/machines/${id}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: entries.map(([product_id, quantity]) => ({ product_id, quantity })),
          notes: restockNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Reposição registrada (${json.data.items_count} produto(s))`);
        setShowRestock(false);
        await loadAll();
      } else {
        toast.error(json.error?.message ?? 'Falha ao registrar reposição');
      }
    } finally {
      setRestocking(false);
    }
  }

  async function submitAdjust() {
    if (!adjustItem) return;
    const qty = parseInt(countedQty);
    if (isNaN(qty) || qty < 0) { toast.error('Quantidade inválida'); return; }
    if (!adjustNotes.trim() || adjustNotes.trim().length < 3) {
      toast.error('Justificativa obrigatória (mín. 3 caracteres)');
      return;
    }
    setAdjusting(true);
    try {
      const res = await fetch(`/api/app/machines/${id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: adjustItem.product_id,
          counted_quantity: qty,
          notes: adjustNotes.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Ajuste registrado (delta: ${json.data.delta >= 0 ? '+' : ''}${json.data.delta})`);
        setAdjustItem(null);
        await loadAll();
      } else {
        toast.error(json.error?.message ?? 'Falha ao ajustar');
      }
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const delta = adjustItem ? parseInt(countedQty || '0') - adjustItem.current_quantity : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/app/maquinas/${id}`}>
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Estoque da Máquina</h1>
            {machine && <Pill tone="navy" size="sm">{machine.code}</Pill>}
          </div>
          <p className="text-text-secondary">{machine?.name}</p>
        </div>
        <Link href={`/app/maquinas/${id}/produtos`}>
          <Button variant="outline">Planograma</Button>
        </Link>
        <Button onClick={openRestock} disabled={items.length === 0}>
          <PackagePlus className="mr-2 h-4 w-4" />
          Repor
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Itens na Máquina"
            value={String(summary.total_items)}
            icon={Package}
          />
          <KpiCard
            label="Taxa de Preenchimento"
            value={summary.fill_rate !== null ? `${summary.fill_rate}%` : '—'}
            icon={ClipboardCheck}
          />
          <KpiCard
            label="Posições Críticas"
            value={String(summary.critical_slots)}
            hint="Abaixo de 30%"
            icon={AlertTriangle}
          />
          <KpiCard
            label="Posições Ativas"
            value={String(summary.total_slots)}
            icon={Package}
          />
        </div>
      )}

      {/* Pick list — O que levar */}
      {items.some(i => i.max_capacity !== null && i.max_capacity - i.current_quantity > 0) && (
        <Card className="border-brand-navy/20 bg-brand-navy/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-brand-navy" />
              O que levar
              <span className="text-xs text-text-tertiary font-normal ml-2">
                (capacidade − estoque atual)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items
                .filter(i => i.max_capacity !== null && i.max_capacity - i.current_quantity > 0)
                .map(item => {
                  const prod = Array.isArray(item.product) ? item.product[0] : item.product;
                  const toFill = (item.max_capacity ?? 0) - item.current_quantity;
                  return (
                    <div key={item.product_id} className="flex items-center gap-2 rounded-md border border-border-default bg-surface-card px-3 py-2">
                      {item.slot_code && (
                        <span className="text-[11px] font-mono text-text-tertiary">{item.slot_code}</span>
                      )}
                      <span className="text-sm font-medium truncate flex-1">{prod?.name ?? '—'}</span>
                      <span className="text-sm font-bold tabular-nums text-brand-navy">{toFill}</span>
                    </div>
                  );
                })}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={openRestock}>
                <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
                Registrar reposição
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estoque por Posição
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-text-tertiary/50 mb-3" />
              <p className="text-sm font-medium text-text-primary">Sem dados de estoque</p>
              <p className="text-xs text-text-tertiary mt-1">
                Configure o planograma e registre movimentações para ver o estoque.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Slot</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center w-[80px]">Atual</TableHead>
                  <TableHead className="text-center w-[80px]">Cap.</TableHead>
                  <TableHead className="w-[160px]">Nível</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const prod = Array.isArray(item.product) ? item.product[0] : item.product;
                  return (
                    <TableRow key={item.product_id} className={item.fill_level !== null && item.fill_level < 0.2 ? 'bg-red-50/50' : ''}>
                      <TableCell className="font-mono text-xs">{item.slot_code ?? '—'}</TableCell>
                      <TableCell>
                        <p className="font-medium">{prod?.name ?? '—'}</p>
                        {prod?.unit_size && (
                          <span className="text-[11px] text-text-tertiary">{prod.unit_size}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {item.current_quantity}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-text-tertiary">
                        {item.max_capacity ?? '—'}
                      </TableCell>
                      <TableCell>
                        <FillBar level={item.fill_level} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjust(item)}
                        >
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movimentações recentes */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={loadMovements}>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4" />
            Movimentações Recentes
            <span className="text-xs text-text-tertiary font-normal ml-2">
              {showMovements ? '(ocultar)' : '(expandir)'}
            </span>
          </CardTitle>
        </CardHeader>
        {showMovements && movements.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Quando</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right w-[80px]">Qtd</TableHead>
                  <TableHead>Obs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => {
                  const meta = KIND_LABELS[m.movement_type] ?? { label: m.movement_type, tone: 'neutral' };
                  const prod = Array.isArray(m.product) ? m.product[0] : m.product;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs tabular-nums font-mono">
                        {new Date(m.occurred_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <Pill tone={meta.tone as 'success' | 'danger' | 'amber' | 'info' | 'neutral'} size="sm">
                          {meta.label}
                        </Pill>
                      </TableCell>
                      <TableCell className="text-sm">{prod?.name ?? '—'}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-text-tertiary max-w-[200px] truncate">
                        {m.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Dialog de ajuste */}
      <Dialog open={!!adjustItem} onOpenChange={(open) => { if (!open) setAdjustItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste de Inventário</DialogTitle>
            <DialogDescription>
              Informe a contagem física e a justificativa para o ajuste.
            </DialogDescription>
          </DialogHeader>
          {adjustItem && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-surface-secondary p-3">
                <p className="text-sm font-medium">
                  {(Array.isArray(adjustItem.product) ? adjustItem.product[0] : adjustItem.product)?.name}
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Slot: {adjustItem.slot_code ?? '—'} · Estoque sistema: {adjustItem.current_quantity}
                  {adjustItem.max_capacity && ` · Capacidade: ${adjustItem.max_capacity}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="counted">Contagem física *</Label>
                <Input
                  id="counted"
                  type="number"
                  min="0"
                  value={countedQty}
                  onChange={(e) => setCountedQty(e.target.value)}
                  className="tabular-nums"
                />
                {delta !== 0 && (
                  <p className={`text-xs font-medium ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Delta: {delta > 0 ? '+' : ''}{delta} unidade(s)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Justificativa *</Label>
                <Input
                  id="notes"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Ex: Contagem física divergente, possível furto"
                />
                <p className="text-[11px] text-text-tertiary">Obrigatório. Explique o motivo da divergência.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancelar</Button>
            <Button onClick={submitAdjust} disabled={adjusting || delta === 0}>
              {adjusting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Registrar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de reposição rápida */}
      <Dialog open={showRestock} onOpenChange={setShowRestock}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Reposição</DialogTitle>
            <DialogDescription>
              Informe a quantidade reposta por produto. Valores pré-preenchidos com base na capacidade disponível.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {items.map(item => {
              const prod = Array.isArray(item.product) ? item.product[0] : item.product;
              const toFill = item.max_capacity !== null ? Math.max(0, item.max_capacity - item.current_quantity) : 0;
              const qty = restockDrafts[item.product_id] ?? 0;
              return (
                <div key={item.product_id} className="flex items-center gap-3 rounded-md border border-border-default p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{prod?.name ?? '—'}</p>
                    <p className="text-[11px] text-text-tertiary">
                      {item.slot_code && `${item.slot_code} · `}
                      Atual: {item.current_quantity}{item.max_capacity !== null && ` / ${item.max_capacity}`}
                      {toFill > 0 && ` · Faltam: ${toFill}`}
                    </p>
                  </div>
                  <div className="flex items-center rounded-md border border-border-default overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setRestockDrafts(d => ({ ...d, [item.product_id]: Math.max(0, qty - 1) }))}
                      className="h-8 w-8 flex items-center justify-center text-sm font-semibold text-text-secondary hover:bg-surface-subtle"
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => setRestockDrafts(d => ({ ...d, [item.product_id]: Math.max(0, Number(e.target.value)) }))}
                      className="h-8 w-12 text-center text-sm font-semibold tabular-nums border-x border-border-default bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setRestockDrafts(d => ({ ...d, [item.product_id]: qty + 1 }))}
                      className="h-8 w-8 flex items-center justify-center text-sm font-semibold text-text-secondary hover:bg-surface-subtle"
                    >+</button>
                  </div>
                </div>
              );
            })}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="restock-notes">Observações (opcional)</Label>
              <Input
                id="restock-notes"
                value={restockNotes}
                onChange={(e) => setRestockNotes(e.target.value)}
                placeholder="Ex: Reposição parcial, faltou Coca-Cola no estoque"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestock(false)}>Cancelar</Button>
            <Button
              onClick={submitRestock}
              disabled={restocking || Object.values(restockDrafts).every(q => q === 0)}
            >
              {restocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
              Confirmar Reposição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
