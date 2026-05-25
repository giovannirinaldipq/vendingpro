'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { updateTenantSchema, type UpdateTenantInput } from '@/lib/validators';
import type { Plan } from '@/types';

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Partial<UpdateTenantInput> | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<UpdateTenantInput>({
    resolver: zodResolver(updateTenantSchema),
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/tenants/${id}`).then(r => r.json()),
      fetch('/api/admin/plans').then(r => r.json()),
    ]).then(([t, p]) => {
      if (t.success) {
        const data = t.data;
        setInitial(data);
        reset({
          company_name: data.company_name ?? '',
          trade_name: data.trade_name ?? '',
          document_type: data.document_type ?? 'cnpj',
          document_number: data.document_number ?? '',
          contact_name: data.contact_name ?? '',
          contact_email: data.contact_email ?? '',
          contact_phone: data.contact_phone ?? '',
          financial_email: data.financial_email ?? '',
          financial_phone: data.financial_phone ?? '',
          address_street: data.address_street ?? '',
          address_number: data.address_number ?? '',
          address_complement: data.address_complement ?? '',
          address_neighborhood: data.address_neighborhood ?? '',
          address_city: data.address_city ?? '',
          address_state: data.address_state ?? '',
          address_zipcode: data.address_zipcode ?? '',
          plan_id: data.plan_id ?? undefined,
          billing_day: data.billing_day ?? 10,
          source: data.source ?? '',
        });
      }
      if (p.success) setPlans(p.data);
    });
  }, [id, reset]);

  const documentType = watch('document_type');

  async function onSubmit(data: UpdateTenantInput) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Cliente atualizado');
        router.push(`/admin/clientes/${id}`);
      } else {
        toast.error(json.error?.message ?? 'Erro ao salvar');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!initial) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/clientes/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar cliente</h1>
          <p className="text-muted-foreground">{initial.company_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="company_name">Razão social *</Label>
                <Input id="company_name" {...register('company_name')} />
                {errors.company_name && <p className="text-xs text-danger">{errors.company_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trade_name">Nome fantasia</Label>
                <Input id="trade_name" {...register('trade_name')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <Select value={documentType} onValueChange={(v) => v && setValue('document_type', v as 'cpf' | 'cnpj')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="document_number">{documentType === 'cnpj' ? 'CNPJ' : 'CPF'} *</Label>
                <Input id="document_number" {...register('document_number')} />
                {errors.document_number && <p className="text-xs text-danger">{errors.document_number.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Responsável *</Label>
                <Input id="contact_name" {...register('contact_name')} />
                {errors.contact_name && <p className="text-xs text-danger">{errors.contact_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input id="contact_phone" {...register('contact_phone')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">Email *</Label>
              <Input id="contact_email" type="email" {...register('contact_email')} />
              {errors.contact_email && <p className="text-xs text-danger">{errors.contact_email.message}</p>}
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="financial_email">Email financeiro</Label>
                <Input id="financial_email" type="email" {...register('financial_email')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="financial_phone">Telefone financeiro</Label>
                <Input id="financial_phone" {...register('financial_phone')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plano e cobrança</CardTitle>
            <CardDescription>Para suspender ou reativar, use as ações da tela de detalhes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select
                  value={watch('plan_id') ?? ''}
                  onValueChange={(v) => v && setValue('plan_id', v as string)}
                >
                  <SelectTrigger>
                    <SelectValue>{plans.find(p => p.id === watch('plan_id'))?.name ?? 'Selecione'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · R$ {p.price_per_machine}/máquina
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dia de cobrança</Label>
                <Select
                  value={String(watch('billing_day') ?? 10)}
                  onValueChange={(v) => v && setValue('billing_day', parseInt(v))}
                >
                  <SelectTrigger><SelectValue>Dia {watch('billing_day') ?? 10}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {[1, 5, 10, 15, 20, 25].map(d => (
                      <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/admin/clientes/${id}`}>
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
