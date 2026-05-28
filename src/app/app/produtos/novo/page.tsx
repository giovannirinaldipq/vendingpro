'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Info, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { cn } from '@/lib/utils';

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category: z.string().max(60).optional(),
  unit_size: z.string().max(20).optional(),  // ex: "350ml", "41,5g"
  default_sale_price: z.number().positive().optional(),
  default_cost_price: z.number().positive().optional(),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

// Sugestões de categorias — cliente pode digitar livre OU escolher uma
const CATEGORY_SUGGESTIONS = [
  'Refrigerantes', 'Águas', 'Sucos', 'Energéticos', 'Cervejas',
  'Chocolates', 'Salgadinhos', 'Biscoitos', 'Balas e Chicletes',
  'Café', 'Snacks Salgados', 'Snacks Doces', 'Saudáveis', 'Outros',
];

// Função para padronizar nomes de produtos
const standardizeProductName = (name: string): string => {
  // Remove espaços extras no início e fim
  const trimmed = name.trim();

  // Converte para o formato tradicional (apenas a primeira letra de cada palavra maiúscula)
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [duplicateMatch, setDuplicateMatch] = useState<{ id: string; name: string } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [priceEditing, setPriceEditing] = useState({ sale: false, cost: false });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      is_active: true,
    },
  });

  const nameValue = watch('name');

  const checkDuplicate = useCallback(async (name: string) => {
    if (!name || name.length < 2) {
      setDuplicateMatch(null);
      return;
    }
    setCheckingDuplicate(true);
    try {
      const res = await fetch(`/api/app/products?search=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (json.success && json.data.products.length > 0) {
        const exact = json.data.products.find(
          (p: { name: string }) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (exact) {
          setDuplicateMatch({ id: exact.id, name: exact.name });
        } else {
          setDuplicateMatch(null);
        }
      } else {
        setDuplicateMatch(null);
      }
    } catch {
      setDuplicateMatch(null);
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => checkDuplicate(nameValue || ''), 400);
    return () => clearTimeout(t);
  }, [nameValue, checkDuplicate]);

  function pickCategory(c: string) {
    setSelectedCategory(c);
    setValue('category', c);
  }

  async function onSubmit(data: ProductFormData) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/app/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Produto cadastrado com sucesso!');
        router.push('/app/produtos');
      } else {
        toast.error(result.error?.message || 'Erro ao cadastrar produto');
      }
    } catch {
      toast.error('Erro ao cadastrar produto. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/produtos">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Produto</h1>
          <p className="text-text-secondary">
            Cadastre um produto no catálogo. O preço de venda final é definido por máquina.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>Dados básicos do produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Coca-Cola Lata"
                  {...register('name', {
                    onChange: (e) => {
                      const value = e.target.value;
                      setValue('name', standardizeProductName(value));
                    }
                  })}
                />
                {errors.name && (
                  <p className="text-xs text-danger">{errors.name.message}</p>
                )}
                {duplicateMatch && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="text-amber-800 font-medium">
                        Já existe &quot;{duplicateMatch.name}&quot; cadastrado
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] px-2"
                          onClick={() => router.push(`/app/produtos/${duplicateMatch.id}`)}
                        >
                          Usar existente
                        </Button>
                        <span className="text-[11px] text-amber-700 self-center">
                          ou altere o nome para criar um novo
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_size">Tamanho / Gramatura</Label>
                <Input
                  id="unit_size"
                  placeholder="Ex: 350ml, 41,5g, 500ml"
                  {...register('unit_size')}
                />
                <p className="text-[11px] text-text-tertiary">
                  Volume (ml), peso (g) ou outra unidade — opcional, ajuda na conferência
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                placeholder="Digite uma categoria ou clique numa sugestão abaixo"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setValue('category', e.target.value);
                }}
                autoComplete="off"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_SUGGESTIONS.map(c => {
                  const active = selectedCategory.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => pickCategory(c)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-brand-navy bg-brand-navy text-white'
                          : 'border-border-default bg-surface-card text-text-secondary hover:border-brand-navy hover:text-brand-navy'
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {c}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-text-tertiary">
                Use suas próprias categorias — não precisa seguir uma lista fixa
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preços padrão</CardTitle>
            <CardDescription>Referência base — sobrescreva por máquina quando necessário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft/40 p-3 text-xs">
              <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <p className="text-text-secondary">
                O mesmo produto pode ter preços diferentes em máquinas diferentes
                (ex: Kit Kat R$ 4 numa máquina e R$ 6 em outra). Defina o preço
                final em <Pill tone="navy" size="sm">Máquina → Produtos</Pill> depois de cadastrar.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default_sale_price">Preço de Venda Padrão (R$)</Label>
                {priceEditing.sale ? (
                  <Input
                    id="default_sale_price"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    {...register('default_sale_price', { valueAsNumber: true })}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPriceEditing(p => ({ ...p, sale: true }))}
                    className="flex h-9 w-full items-center rounded-md border border-dashed border-input bg-muted px-3 text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Editar preço
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_cost_price">Preço de Custo (R$)</Label>
                {priceEditing.cost ? (
                  <Input
                    id="default_cost_price"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0,00"
                    {...register('default_cost_price', { valueAsNumber: true })}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPriceEditing(p => ({ ...p, cost: true }))}
                    className="flex h-9 w-full items-center rounded-md border border-dashed border-input bg-muted px-3 text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Editar preço
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/app/produtos">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Cadastrar Produto'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
