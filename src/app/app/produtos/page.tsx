'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import type { Product } from '@/types';

interface ProductsResponse {
  products: Product[];
  total: number;
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
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
  };

  useEffect(() => {
    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [search]);

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
        <Link href="/app/produtos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
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
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">Nenhum produto cadastrado</p>
              <Link href="/app/produtos/novo">
                <Button variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar primeiro produto
                </Button>
              </Link>
            </div>
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.barcode || 'Sem código'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category || 'Sem categoria'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.default_sale_price
                        ? `R$ ${product.default_sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.default_cost_price
                        ? `R$ ${product.default_cost_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/app/produtos/${product.id}`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
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
    </div>
  );
}
