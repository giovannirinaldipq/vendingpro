'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TenantOption { id: string; company_name: string; }

interface Form {
  tenant_id: string;
  reference_month: string;
  due_date: string;
  machines_count: number;
  price_per_machine: number;
  discount: number;
  adjustments: { description: string; amount: number }[];
}

function ManualInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTenant = searchParams.get('tenant_id') ?? '';

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const dueIn7 = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    defaultValues: {
      tenant_id: prefillTenant,
      reference_month: firstOfMonth,
      due_date: dueIn7,
      machines_count: 1,
      price_per_machine: 49,
      discount: 0,
      adjustments: [],
    },
  });

  useEffect(() => {
    fetch('/api/admin/tenants?per_page=200')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setTenants(j.data.tenants.map((t: { id: string; company_name: string }) => ({ id: t.id, company_name: t.company_name })));
        }
      });
  }, []);

  const machinesCount = Number(watch('machines_count') || 0);
  const pricePerMachine = Number(watch('price_per_machine') || 0);
  const discount = Number(watch('discount') || 0);
  const adjustments = watch('adjustments') ?? [];
  const adjustmentsTotal = adjustments.reduce((acc, a) => acc + Number(a.amount || 0), 0);
  const subtotal = machinesCount * pricePerMachine;
  const total = Math.max(subtotal - discount + adjustmentsTotal, 0);

  function addAdjustment() {
    setValue('adjustments', [...adjustments, { description: '', amount: 0 }]);
  }
  function removeAdjustment(i: number) {
    setValue('adjustments', adjustments.filter((_, idx) => idx !== i));
  }
  function updateAdjustment(i: number, key: 'description' | 'amount', val: string | number) {
    const next = adjustments.slice();
    next[i] = { ...next[i], [key]: key === 'amount' ? Number(val) : val };
    setValue('adjustments', next);
  }

  async function onSubmit(data: Form) {
    if (!data.tenant_id) {
      toast.error('Selecione um cliente');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: data.tenant_id,
          reference_month: data.reference_month,
          due_date: data.due_date,
          machines_count: Number(data.machines_count),
          price_per_machine: Number(data.price_per_machine),
          discount: Number(data.discount),
          adjustments: data.adjustments,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Fatura ${json.data.invoice_number} criada`);
        router.push(`/admin/clientes/${data.tenant_id}`);
      } else {
        toast.error(json.error?.message ?? 'Falha ao gerar fatura');
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedTenant = tenants.find(t => t.id === watch('tenant_id'));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/faturas">
          <Button variant="ghost" size="icon" aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fatura manual</h1>
          <p className="text-muted-foreground">Para emissões fora do ciclo automático</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente e período</CardTitle>
              <CardDescription>Quem será cobrado e em qual mês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={watch('tenant_id') || ''} onValueChange={(v) => v && setValue('tenant_id', v)}>
                  <SelectTrigger>
                    <SelectValue>{selectedTenant?.company_name ?? 'Selecione um cliente'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reference_month">Mês de referência *</Label>
                  <Input id="reference_month" type="date" {...register('reference_month', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due_date">Vencimento *</Label>
                  <Input id="due_date" type="date" {...register('due_date', { required: true })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
              <CardDescription>Quantidade de máquinas × preço unitário</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="machines_count">Máquinas</Label>
                  <Input id="machines_count" type="number" min="1" {...register('machines_count', { valueAsNumber: true })} />
                  {errors.machines_count && <p className="text-xs text-danger">{errors.machines_count.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price_per_machine">Preço por máquina (R$)</Label>
                  <Input id="price_per_machine" type="number" step="0.01" min="0" {...register('price_per_machine', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input id="discount" type="number" step="0.01" min="0" {...register('discount', { valueAsNumber: true })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Ajustes manuais</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addAdjustment}>
                    <Plus className="mr-1 h-3 w-3" />Adicionar
                  </Button>
                </div>
                {adjustments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem ajustes. Adicione se houver multa, juros ou crédito.</p>
                ) : (
                  <div className="space-y-2">
                    {adjustments.map((adj, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Descrição"
                          value={adj.description}
                          onChange={(e) => updateAdjustment(i, 'description', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="0,00"
                          type="number"
                          step="0.01"
                          value={adj.amount}
                          onChange={(e) => updateAdjustment(i, 'amount', e.target.value)}
                          className="w-32"
                        />
                        <Button type="button" size="icon" variant="ghost" aria-label="Remover ajuste" onClick={() => removeAdjustment(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo */}
        <div>
          <Card className="sticky top-4">
            <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Subtotal" value={subtotal} />
              {discount > 0 && <Row label="Desconto" value={-discount} />}
              {adjustmentsTotal !== 0 && <Row label="Ajustes" value={adjustmentsTotal} />}
              <div className="border-t pt-3 flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold tabular-nums">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-4">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar fatura
              </Button>
              <p className="text-[11px] text-muted-foreground">
                A fatura é criada em status <strong>pendente</strong>. Use o botão "Reenviar" depois pra enviar email ao cliente.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
  );
}

export default function ManualInvoicePage() {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ManualInvoiceForm />
    </Suspense>
  );
}
