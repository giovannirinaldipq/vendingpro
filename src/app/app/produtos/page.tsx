'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Loader2,
  Sparkles,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Product } from '@/types';

interface ProductsResponse {
  products: Product[];
  total: number;
}

interface CatalogItem {
  id: string;
  name: string;
  brand: string | null;
  unit_size: string;
  category: string;
  barcode: string | null;
  suggested_sale_price: number | null;
  suggested_cost_price: number | null;
  popularity_rank: number | null;
  already_imported: boolean;
}

const fmtBRL = (n: number | null) =>
  n != null ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Catálogo
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/app/products?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || 'Erro ao carregar produtos');
      }
    } catch {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [fetchProducts]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams();
      if (catalogSearch) params.set('search', catalogSearch);
      if (catalogCategory) params.set('category', catalogCategory);
      const res = await fetch(`/api/app/products/catalog?${params}`);
      const json = await res.json();
      if (json.success) {
        setCatalogItems(json.data.items);
        setCatalogCategories(json.data.categories);
      } else {
        toast.error('Erro ao carregar catálogo');
      }
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogSearch, catalogCategory]);

  useEffect(() => {
    if (!catalogOpen) return;
    const t = setTimeout(fetchCatalog, 250);
    return () => clearTimeout(t);
  }, [catalogOpen, fetchCatalog]);

  function openCatalog() {
    setSelectedIds(new Set());
    setCatalogSearch('');
    setCatalogCategory('');
    setCatalogOpen(true);
  }

  function toggleId(id: string, already: boolean) {
    if (already) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    const ids = catalogItems.filter(i => !i.already_imported).map(i => i.id);
    setSelectedIds(new Set(ids));
  }

  async function importSelected() {
    if (selectedIds.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/app/products/import-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog_ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        const { imported, skipped } = json.data;
        if (skipped > 0) {
          toast.success(`${imported} importados, ${skipped} já existiam`);
        } else {
          toast.success(`${imported} produtos importados!`);
        }
        setCatalogOpen(false);
        fetchProducts();
      } else {
        toast.error(json.error?.message ?? 'Erro ao importar');
      }
    } finally {
      setImporting(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const response = await fetch(`/api/app/products/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast.success('Produto excluído com sucesso');
        fetchProducts();
      } else {
        toast.error(result.error?.message || 'Erro ao excluir produto');
      }
    } catch {
      toast.error('Erro ao excluir produto');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de produtos das suas máquinas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCatalog}>
            <Sparkles className="mr-2 h-4 w-4 text-brand-amber" />
            Importar do catálogo
          </Button>
          <Link href="/app/produtos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data?.total || 0} produto(s) cadastrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.products.length === 0 ? (
            <EmptyStateV2
              illustration="no-machines"
              title="Catálogo vazio"
              description="Comece importando os produtos mais vendidos em vending no Brasil — Coca, Pringles, Bis e mais. Ou cadastre manualmente."
              ctaLabel="Importar do catálogo"
              ctaOnClick={openCatalog}
              secondaryLabel="Cadastrar manualmente"
              secondaryHref="/app/produtos/novo"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Preço Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10">
                          <Package className="h-5 w-5 text-brand-navy" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.unit_size && (
                            <p className="text-xs text-text-tertiary tabular-nums">{product.unit_size}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Pill tone="outline">{product.category || 'Sem categoria'}</Pill>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {product.default_sale_price
                        ? `R$ ${product.default_sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {product.default_cost_price
                        ? `R$ ${product.default_cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Pill tone={product.is_active ? 'success' : 'neutral'} dot>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                          aria-label={`Ações de ${product.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={`/app/produtos/${product.id}`} className="flex items-center gap-2 w-full">
                              <Edit className="h-4 w-4" />Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-brand-amber" />
              Catálogo VendingPro — top vendidos no Brasil
            </DialogTitle>
            <DialogDescription>
              Curadoria com os produtos mais vendidos em vending machines no Brasil
              (refrigerantes, snacks, chocolates). Selecione os que você vende e
              importe com 1 clique — vem com preço sugerido pra agilizar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto ou marca..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:max-w-[60%]">
              <button
                type="button"
                onClick={() => setCatalogCategory('')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  catalogCategory === ''
                    ? 'bg-brand-navy text-white'
                    : 'bg-surface-subtle text-text-secondary hover:bg-surface-subtle/80'
                )}
              >
                Todos
              </button>
              {catalogCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategory(cat === catalogCategory ? '' : cat)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    catalogCategory === cat
                      ? 'bg-brand-navy text-white'
                      : 'bg-surface-subtle text-text-secondary hover:bg-surface-subtle/80'
                  )}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border-default">
            {catalogLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
              </div>
            ) : catalogItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-tertiary">
                Nenhum item no catálogo bate com sua busca.
              </p>
            ) : (
              <ul className="divide-y divide-border-default">
                {catalogItems.map(item => {
                  const selected = selectedIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      onClick={() => toggleId(item.id, item.already_imported)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 transition-colors',
                        item.already_imported
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-surface-subtle/60',
                        selected && 'bg-brand-amber/10'
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
                        item.already_imported
                          ? 'border-success bg-success text-white'
                          : selected
                            ? 'border-brand-navy bg-brand-navy text-white'
                            : 'border-border-default'
                      )}>
                        {(selected || item.already_imported) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          {item.popularity_rank && item.popularity_rank <= 20 && (
                            <Pill tone="amber" size="sm">Top {item.popularity_rank}</Pill>
                          )}
                          {item.already_imported && (
                            <Pill tone="success" size="sm">Já importado</Pill>
                          )}
                        </div>
                        <p className="text-xs text-text-tertiary">
                          {item.brand && <span>{item.brand} · </span>}
                          {item.unit_size} · {item.category.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">
                          {fmtBRL(item.suggested_sale_price)}
                        </p>
                        <p className="text-[11px] text-text-tertiary tabular-nums">
                          custo {fmtBRL(item.suggested_cost_price)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:gap-2">
            <div className="flex items-center gap-3 text-xs text-text-tertiary mr-auto">
              <button
                type="button"
                onClick={selectAllVisible}
                className="font-medium text-brand-navy hover:underline"
              >
                Selecionar todos visíveis
              </button>
              <span>•</span>
              <span className="tabular-nums">{selectedIds.size} selecionado(s)</span>
            </div>
            <Button variant="outline" onClick={() => setCatalogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={importSelected} disabled={selectedIds.size === 0 || importing}>
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
              ) : (
                <>Importar {selectedIds.size} {selectedIds.size === 1 ? 'produto' : 'produtos'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
