'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Package,
  Loader2,
  AlertTriangle,
  Plus,
  Minus,
  RefreshCw,
  TrendingDown,
  Boxes,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { KpiCardHero } from '@/components/ui/kpi-hero';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  category?: string;
  default_sale_price?: number;
  default_cost_price?: number;
}

interface InventoryItem {
  id: string;
  product_id: string;
  current_quantity: number;
  minimum_quantity: number;
  last_updated_at: string;
  product: Product;
}

interface InventoryStats {
  total_items: number;
  low_stock_count: number;
  total_value: number;
  products_count: number;
}

interface InventoryResponse {
  inventory: InventoryItem[];
  total: number;
  stats: InventoryStats;
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showLowStock) params.set('low_stock', 'true');

      const response = await fetch(`/api/app/inventory?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || 'Erro ao carregar estoque');
      }
    } catch {
      toast.error('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchInventory, 300);
    return () => clearTimeout(debounce);
  }, [search, showLowStock]);

  const handleMovement = async () => {
    if (!selectedItem || !movementQuantity) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/app/inventory/${selectedItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movement_type: movementType,
          quantity: parseInt(movementQuantity),
          reason: movementReason || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Movimentação registrada com sucesso!');
        setSelectedItem(null);
        setMovementQuantity('');
        setMovementReason('');
        fetchInventory();
      } else {
        toast.error(result.error?.message || 'Erro ao registrar movimentação');
      }
    } catch {
      toast.error('Erro ao registrar movimentação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.current_quantity <= item.minimum_quantity;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie o estoque central de produtos
          </p>
        </div>
        <Link href="/app/estoque/adicionar">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Button>
        </Link>
      </div>

      {/* Stats Cards — HERO Valor em Estoque + 3 secundários */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <KpiCardHero
              label="Valor em Estoque"
              value={`R$ ${data.stats.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              subtitle={`${data.stats.products_count} SKUs · ${data.stats.total_items.toLocaleString('pt-BR')} unidades`}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                SKUs
              </CardTitle>
              <Boxes className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={2} />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-medium tabular-nums text-text-primary">{data.stats.products_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                Unidades
              </CardTitle>
              <Package className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={2} />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-3xl font-medium tabular-nums text-text-primary">
                {data.stats.total_items.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className={data.stats.low_stock_count > 0 ? 'border-warning/40' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                Estoque Baixo
              </CardTitle>
              <TrendingDown className={`h-3.5 w-3.5 ${data.stats.low_stock_count > 0 ? 'text-warning' : 'text-text-tertiary'}`} strokeWidth={2} />
            </CardHeader>
            <CardContent>
              <div className={`font-mono text-3xl font-medium tabular-nums ${data.stats.low_stock_count > 0 ? 'text-warning' : 'text-text-primary'}`}>
                {data.stats.low_stock_count}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, código ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="low-stock"
                checked={showLowStock}
                onCheckedChange={setShowLowStock}
              />
              <Label htmlFor="low-stock" className="text-sm">
                Apenas estoque baixo
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Itens em Estoque</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data?.total || 0} produto(s) no estoque`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.inventory.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">Nenhum produto no estoque</p>
              <Link href="/app/estoque/adicionar">
                <Button variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar primeiro produto
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.inventory.map((item) => (
                  <TableRow key={item.id} className={isLowStock(item) ? 'bg-warning-soft/40' : ''}>
                    <TableCell>
                      <Link
                        href={`/app/estoque/${item.id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                        title="Ver extrato"
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isLowStock(item) ? 'bg-warning-soft' : 'bg-brand-navy/10'}`}>
                          <Package className={`h-5 w-5 ${isLowStock(item) ? 'text-warning' : 'text-brand-navy'}`} />
                        </div>
                        <div>
                          <p className="font-medium hover:underline">{item.product.name}</p>
                          {item.product.category && (
                            <p className="text-xs text-text-tertiary">
                              {item.product.category}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Pill tone="outline">{item.product.category || 'Sem categoria'}</Pill>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium tabular-nums ${isLowStock(item) ? 'text-warning' : ''}`}>
                        {item.current_quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-text-tertiary tabular-nums">
                      {item.minimum_quantity}
                    </TableCell>
                    <TableCell>
                      {isLowStock(item) ? (
                        <Pill tone="warning" dot>
                          <AlertTriangle className="h-3 w-3" />
                          Baixo
                        </Pill>
                      ) : (
                        <Pill tone="success" dot>
                          Normal
                        </Pill>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.product.default_cost_price
                        ? `R$ ${item.product.default_cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Movimentar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              {selectedItem?.product.name} - Quantidade atual: {selectedItem?.current_quantity}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Movimentação</Label>
              <Select
                value={movementType}
                onValueChange={(v) => v && setMovementType(v as 'in' | 'out' | 'adjustment')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">
                    <div className="flex items-center">
                      <Plus className="mr-2 h-4 w-4 text-success" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="out">
                    <div className="flex items-center">
                      <Minus className="mr-2 h-4 w-4 text-danger" />
                      Saída
                    </div>
                  </SelectItem>
                  <SelectItem value="adjustment">
                    <div className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 text-info" />
                      Ajuste (definir quantidade)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                {movementType === 'adjustment' ? 'Nova Quantidade' : 'Quantidade'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ex: Compra de fornecedor, Reabastecimento..."
              />
            </div>

            {movementType !== 'adjustment' && movementQuantity && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm">
                  Quantidade após movimentação:{' '}
                  <span className="font-medium">
                    {movementType === 'in'
                      ? (selectedItem?.current_quantity || 0) + parseInt(movementQuantity || '0')
                      : (selectedItem?.current_quantity || 0) - parseInt(movementQuantity || '0')}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={isSubmitting || !movementQuantity}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
