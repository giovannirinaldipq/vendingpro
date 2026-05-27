'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Plus, Trash2, Save, AlertCircle, Package, Info, LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Pill } from '@/components/ui/pill';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ProductRef {
  id: string;
  name: string;
  category: string | null;
  unit_size: string | null;
  default_sale_price: number | null;
  default_cost_price: number | null;
}

interface MachineProduct {
  id: string;
  sale_price: number;
  cost_price: number | null;
  slot_code: string | null;
  max_capacity: number | null;
  is_active: boolean;
  product: ProductRef;
}

interface MachineInventoryItem {
  product_id: string;
  current_quantity: number;
  fill_level: number | null;
}

interface MachineInfo {
  id: string;
  code: string;
  name: string;
}

const fmtBRL = (n?: number | null) =>
  n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

function FillBar({ level }: { level: number | null }) {
  if (level === null) return <span className="text-xs text-text-tertiary">—</span>;
  const pct = Math.round(level * 100);
  const color = pct >= 50 ? 'bg-emerald-500' : pct >= 20 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-surface-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-text-tertiary">{pct}%</span>
    </div>
  );
}

export default function MachineProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [items, setItems] = useState<MachineProduct[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Map<string, MachineInventoryItem>>(new Map());
  const [loading, setLoading] = useState(true);

  // Dialog adicionar
  const [dlgOpen, setDlgOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ProductRef[]>([]);
  const [newProductId, setNewProductId] = useState<string>('');
  const [newSalePrice, setNewSalePrice] = useState<string>('');
  const [newSlot, setNewSlot] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<string>('');
  const [adding, setAdding] = useState(false);

  // Dirty tracking pra preço/slot/capacidade inline
  const [drafts, setDrafts] = useState<Record<string, { sale_price?: number; slot_code?: string; max_capacity?: number | null }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [machineRes, mpRes, productsRes, invRes] = await Promise.all([
        fetch(`/api/app/machines/${id}`),
        fetch(`/api/app/machines/${id}/products`),
        fetch(`/api/app/products`),
        fetch(`/api/app/machines/${id}/inventory`),
      ]);
      const machineJson = await machineRes.json();
      const mpJson = await mpRes.json();
      const productsJson = await productsRes.json();
      const invJson = await invRes.json();

      if (machineJson.success) setMachine(machineJson.data);
      if (mpJson.success) setItems(mpJson.data.items);
      if (productsJson.success) setAvailableProducts(productsJson.data.products);
      if (invJson.success) {
        const map = new Map<string, MachineInventoryItem>();
        for (const item of invJson.data.items) {
          map.set(item.product_id, item);
        }
        setInventoryMap(map);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Produtos disponíveis pra adicionar (= todos exceto os já cadastrados)
  const linkedIds = new Set(items.map(i => i.product.id));
  const addableProducts = availableProducts.filter(p => !linkedIds.has(p.id));

  function openAddDialog() {
    setNewProductId('');
    setNewSalePrice('');
    setNewSlot('');
    setNewCapacity('');
    setDlgOpen(true);
  }

  async function addProduct() {
    if (!newProductId) { toast.error('Escolha um produto'); return; }
    const price = parseFloat(newSalePrice.replace(',', '.'));
    if (isNaN(price) || price < 0) { toast.error('Preço inválido'); return; }
    const capacity = newCapacity ? parseInt(newCapacity) : null;
    if (capacity !== null && (isNaN(capacity) || capacity < 1)) { toast.error('Capacidade inválida'); return; }
    setAdding(true);
    try {
      const res = await fetch(`/api/app/machines/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: newProductId,
          sale_price: price,
          slot_code: newSlot.trim() || null,
          max_capacity: capacity,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Produto adicionado');
        setDlgOpen(false);
        await loadAll();
      } else {
        toast.error(json.error?.message ?? 'Falha ao adicionar');
      }
    } finally {
      setAdding(false);
    }
  }

  function updateDraft(mpId: string, patch: { sale_price?: number; slot_code?: string; max_capacity?: number | null }) {
    setDrafts(d => ({ ...d, [mpId]: { ...d[mpId], ...patch } }));
  }

  async function saveDraft(mpId: string) {
    const patch = drafts[mpId];
    if (!patch) return;
    setSavingId(mpId);
    try {
      const res = await fetch(`/api/app/machines/${id}/products/${mpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success) {
        setItems(it => it.map(i => i.id === mpId ? { ...i, ...patch } : i));
        setDrafts(d => { const n = { ...d }; delete n[mpId]; return n; });
        toast.success('Salvo');
      } else {
        toast.error(json.error?.message ?? 'Falha ao salvar');
      }
    } finally {
      setSavingId(null);
    }
  }

  async function removeItem(mpId: string, productName: string) {
    if (!confirm(`Remover "${productName}" desta máquina?`)) return;
    const res = await fetch(`/api/app/machines/${id}/products/${mpId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      toast.success('Removido');
      setItems(it => it.filter(i => i.id !== mpId));
    } else {
      toast.error(json.error?.message ?? 'Falha ao remover');
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold tracking-tight">Planograma</h1>
            {machine && <Pill tone="navy" size="sm">{machine.code}</Pill>}
          </div>
          <p className="text-text-secondary">{machine?.name}</p>
        </div>
        <Button onClick={openAddDialog} disabled={addableProducts.length === 0}>
          <Plus className="mr-2 h-4 w-4" />Adicionar produto
        </Button>
      </div>

      <div className="rounded-lg border border-info/30 bg-info-soft/40 p-4 text-sm flex gap-3">
        <LayoutGrid className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-text-primary">Planograma da máquina</p>
          <p className="text-xs text-text-secondary">
            Define quais produtos estão em cada posição e a capacidade máxima por slot.
            O sistema usa essas informações para calcular a pick list de abastecimento
            (capacidade − estoque atual = quantidade a levar).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos cadastrados
          </CardTitle>
          <CardDescription>
            {items.length === 0
              ? 'Nenhum produto vinculado a esta máquina ainda'
              : `${items.length} produto(s) nesta máquina`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-text-tertiary/50 mb-3" />
              <p className="text-sm font-medium text-text-primary">
                Esta máquina ainda não tem produtos
              </p>
              <p className="text-xs text-text-tertiary mt-1 max-w-md">
                Adicione os produtos que essa máquina oferece e seus respectivos preços de venda.
              </p>
              {addableProducts.length === 0 && availableProducts.length === 0 && (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Você ainda não cadastrou nenhum produto.
                  <Link href="/app/produtos/novo" className="font-medium underline">Criar primeiro produto</Link>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Slot</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center w-[100px]">Capacidade</TableHead>
                  <TableHead className="text-center w-[120px]">Nível</TableHead>
                  <TableHead className="text-right w-[140px]">Preço de Venda</TableHead>
                  <TableHead className="text-center w-[90px]">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const draft = drafts[item.id];
                  const hasDraft = draft !== undefined;
                  const currentPrice = draft?.sale_price ?? item.sale_price;
                  const currentSlot = draft?.slot_code ?? item.slot_code ?? '';
                  const currentCapacity = draft?.max_capacity !== undefined ? draft.max_capacity : item.max_capacity;
                  const inv = inventoryMap.get(item.product.id);
                  const fillLevel = inv?.fill_level ?? null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={currentSlot}
                          onChange={(e) => updateDraft(item.id, { slot_code: e.target.value })}
                          placeholder="—"
                          className="h-8 text-xs tabular-nums font-mono w-[70px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.product.category && (
                              <span className="text-[11px] text-text-tertiary">{item.product.category}</span>
                            )}
                            {item.product.unit_size && (
                              <span className="text-[11px] text-text-tertiary tabular-nums">{item.product.unit_size}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          value={currentCapacity ?? ''}
                          onChange={(e) => updateDraft(item.id, { max_capacity: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="—"
                          className="h-8 text-xs tabular-nums text-center w-[70px] mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <FillBar level={fillLevel} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={currentPrice}
                            onChange={(e) => updateDraft(item.id, { sale_price: Number(e.target.value) })}
                            className="h-8 text-right text-sm tabular-nums pl-9 pr-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Pill tone={item.is_active ? 'success' : 'neutral'} size="sm" dot>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </Pill>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {hasDraft && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => saveDraft(item.id)}
                              disabled={savingId === item.id}
                            >
                              {savingId === item.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Save className="h-3 w-3" />}
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => removeItem(item.id, item.product.name)}
                            aria-label={`Remover ${item.product.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-text-tertiary" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog adicionar produto */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar produto à máquina</DialogTitle>
            <DialogDescription>
              Defina o preço de venda específico desta máquina (pode ser diferente do preço padrão do produto)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={newProductId} onValueChange={(v) => {
                const id = v ?? '';
                setNewProductId(id);
                // Pré-preenche preço com o default do produto se houver
                const prod = addableProducts.find(p => p.id === id);
                if (prod?.default_sale_price && !newSalePrice) {
                  setNewSalePrice(String(prod.default_sale_price));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um produto...">
                    {newProductId
                      ? (() => {
                          const p = addableProducts.find(p => p.id === newProductId);
                          return p ? `${p.name}${p.unit_size ? ` (${p.unit_size})` : ''}` : 'Produto';
                        })()
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {addableProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.unit_size && <span className="text-text-tertiary ml-1 text-xs">({p.unit_size})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addableProducts.length === 0 && (
                <p className="text-xs text-text-tertiary">
                  Todos os produtos cadastrados já estão nesta máquina.
                  <Link href="/app/produtos/novo" className="ml-1 text-brand-navy hover:underline">
                    Criar novo produto
                  </Link>
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de venda *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">R$</span>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={newSalePrice}
                    onChange={(e) => setNewSalePrice(e.target.value)}
                    className="pl-9 tabular-nums"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot">Slot</Label>
                <Input
                  id="slot"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  placeholder="Ex: A1"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidade</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  placeholder="Ex: 10"
                  className="tabular-nums"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDlgOpen(false)}>Cancelar</Button>
            <Button onClick={addProduct} disabled={adding || !newProductId}>
              {adding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adicionando...</> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
