'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';

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

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      is_active: true,
    },
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filteredSuggestions = categoryQuery
    ? CATEGORY_SUGGESTIONS.filter(c => c.toLowerCase().includes(categoryQuery.toLowerCase()))
    : CATEGORY_SUGGESTIONS;

  function pickCategory(c: string) {
    setCategoryQuery(c);
    setValue('category', c);
    setShowSuggestions(false);
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
          <Button variant="ghost" size="icon">
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
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-danger">{errors.name.message}</p>
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

            <div className="space-y-2" ref={wrapperRef}>
              <Label htmlFor="category">Categoria</Label>
              <div className="relative">
                <Input
                  id="category"
                  placeholder="Digite ou escolha uma categoria"
                  value={categoryQuery}
                  onChange={(e) => {
                    setCategoryQuery(e.target.value);
                    setValue('category', e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border-default bg-surface-card shadow-popover overflow-hidden">
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filteredSuggestions.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => pickCategory(c)}
                          className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle text-text-primary"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {categoryQuery && !CATEGORY_SUGGESTIONS.some(c => c.toLowerCase() === categoryQuery.toLowerCase()) && (
                      <div className="border-t border-border-default px-3 py-2 text-xs text-text-tertiary bg-surface-subtle">
                        Pressione Enter ou continue para usar &quot;{categoryQuery}&quot; como categoria nova
                      </div>
                    )}
                  </div>
                )}
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
                <Input
                  id="default_sale_price"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register('default_sale_price', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_cost_price">Preço de Custo (R$)</Label>
                <Input
                  id="default_cost_price"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...register('default_cost_price', { valueAsNumber: true })}
                />
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
