'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  category?: string;
}

export default function AddInventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/app/products');
        const result = await response.json();

        if (result.success) {
          setProducts(result.data.products || []);
        }
      } catch {
        toast.error('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProduct || !currentQuantity) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/app/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          current_quantity: parseInt(currentQuantity),
          minimum_quantity: minimumQuantity ? parseInt(minimumQuantity) : 0,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Produto adicionado ao estoque!');
        router.push('/app/estoque');
      } else {
        toast.error(result.error?.message || 'Erro ao adicionar produto');
      }
    } catch {
      toast.error('Erro ao adicionar produto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/estoque">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adicionar ao Estoque</h1>
          <p className="text-muted-foreground">
            Adicione um produto ao controle de estoque
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center text-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium">Nenhum produto cadastrado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre produtos antes de adicionar ao estoque
            </p>
            <Link href="/app/produtos/novo">
              <Button variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Produto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Produto</CardTitle>
              <CardDescription>
                Escolha o produto que deseja adicionar ao estoque
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select value={selectedProduct} onValueChange={(v) => v && setSelectedProduct(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center gap-2">
                          <span>{product.name}</span>
                          {product.barcode && (
                            <span className="text-xs text-muted-foreground">
                              ({product.barcode})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quantidades</CardTitle>
              <CardDescription>
                Defina a quantidade atual e o nível mínimo de estoque
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current_quantity">Quantidade Atual *</Label>
                  <Input
                    id="current_quantity"
                    type="number"
                    min="0"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_quantity">Quantidade Mínima</Label>
                  <Input
                    id="minimum_quantity"
                    type="number"
                    min="0"
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta quando o estoque atingir este nível
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/app/estoque">
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar ao Estoque'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
