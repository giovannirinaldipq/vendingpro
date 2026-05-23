'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
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

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  barcode: z.string().optional(),
  category: z.string().optional(),
  default_sale_price: z.number().positive().optional(),
  default_cost_price: z.number().positive().optional(),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

const categories = [
  'REFRIGERANTES',
  'AGUA',
  'SUCOS',
  'ENERGETICOS',
  'CHOCOLATES',
  'SALGADINHOS',
  'BISCOITOS',
  'BALAS E CHICLETES',
  'CAFE',
  'OUTROS',
];

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
          <p className="text-muted-foreground">
            Cadastre um novo produto no catálogo
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
                  placeholder="Ex: Coca-Cola 350ml"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input
                  id="barcode"
                  placeholder="Ex: 7891234567890"
                  {...register('barcode')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select onValueChange={(value) => setValue('category', value as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preços</CardTitle>
            <CardDescription>Valores padrão do produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default_sale_price">Preço de Venda (R$)</Label>
                <Input
                  id="default_sale_price"
                  type="number"
                  step="0.01"
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
