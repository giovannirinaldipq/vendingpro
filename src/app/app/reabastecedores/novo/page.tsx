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
import { MaskedInput } from '@/components/ui/masked-input';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  document_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  vehicle_plate: z.string().optional(),
  vehicle_model: z.string().optional(),
  pin_code: z.string().regex(/^\d{4,6}$/, 'PIN deve ter 4-6 dígitos').optional().or(z.literal('')),
});
type Input = z.infer<typeof schema>;

export default function NovoRestockerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Input>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Input) {
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== ''));
      const res = await fetch('/api/app/restockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Reabastecedor cadastrado');
        router.push('/app/reabastecedores');
      } else {
        toast.error(json.error ?? 'Falha ao salvar');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link href="/app/reabastecedores" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Novo reabastecedor</CardTitle>
          <CardDescription>Cadastre uma pessoa da equipe que faz visitas às máquinas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" {...register('name')} disabled={loading} />
              {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_number">CPF</Label>
                <MaskedInput
                  id="document_number"
                  mask="cpf"
                  placeholder="000.000.000-00"
                  {...register('document_number')}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <MaskedInput
                  id="phone"
                  mask="phone"
                  placeholder="(00) 00000-0000"
                  {...register('phone')}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} disabled={loading} />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_plate">Placa do veículo</Label>
                <Input id="vehicle_plate" placeholder="ABC-1234" {...register('vehicle_plate')} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_model">Modelo</Label>
                <Input id="vehicle_model" placeholder="Fiat Strada" {...register('vehicle_model')} disabled={loading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin_code">PIN de acesso (futuro app mobile)</Label>
              <Input id="pin_code" placeholder="4 a 6 dígitos" {...register('pin_code')} disabled={loading} />
              {errors.pin_code && <p className="text-xs text-danger mt-1">{errors.pin_code.message}</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Cadastrar reabastecedor'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
