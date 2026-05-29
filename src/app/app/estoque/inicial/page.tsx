'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Package, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  category: string | null;
}

export default function EstoqueInicialPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/app/products');
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty && Number(qty) > 0)
      .map(([product_id, qty]) => ({ product_id, quantity: Number(qty) }));

    if (items.length === 0) {
      toast.error('Informe a quantidade de pelo menos 1 produto');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/app/inventory/initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Estoque inicial registrado para ${json.data.initialized} produto(s)`);
        setDone(true);
      } else {
        toast.error(json.error || 'Erro ao salvar');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-green-800">Estoque inicial registrado</h3>
                <p className="text-green-700 mt-2">
                  Agora você pode importar suas planilhas de vendas. O sistema vai descontar
                  as vendas a partir de hoje automaticamente.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => router.push('/app/relatorios')}>
                  Importar Planilha
                </Button>
                <Button variant="outline" onClick={() => router.push('/app/estoque')}>
                  Ver Estoque
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/app/estoque">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Registrar Estoque Atual</h1>
          <p className="text-sm text-muted-foreground">
            Informe a quantidade atual de cada produto. Isso define o ponto de partida do controle de estoque.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <strong>Importante:</strong> Faça isso ANTES de importar planilhas de vendas.
        O sistema precisa saber quanto você tem hoje para calcular corretamente as saídas.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos cadastrados
          </CardTitle>
          <CardDescription>
            Preencha a quantidade atual de cada produto no seu estoque geral
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum produto cadastrado ainda.{' '}
              <Link href="/app/produtos/novo" className="text-blue-600 underline">Cadastrar produtos</Link>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-[150px] text-right">Quantidade atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-medium">{p.name}</span>
                      {p.category && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={quantities[p.id] || ''}
                        onChange={e => setQuantities(q => ({ ...q, [p.id]: e.target.value }))}
                        className="h-8 w-[100px] text-right ml-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {products.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Salvar Estoque Inicial</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
