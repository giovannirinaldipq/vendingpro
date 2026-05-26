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

const locationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location_type: z.enum(['school', 'company', 'hospital', 'gym', 'mall', 'bus_station', 'condominium', 'university', 'other']).optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  address_zipcode: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contract_type: z.enum(['rent', 'commission', 'free']).optional(),
  contract_value: z.number().optional(),
  commission_percent: z.number().min(0).max(100).optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

export default function NewLocationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  });

  const contractType = watch('contract_type');

  async function onSubmit(data: LocationFormData) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/app/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Local cadastrado com sucesso!');
        router.push('/app/locais');
      } else {
        toast.error(result.error?.message || 'Erro ao cadastrar local');
      }
    } catch {
      toast.error('Erro ao cadastrar local. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/locais">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Local</h1>
          <p className="text-muted-foreground">
            Cadastre um novo ponto para suas máquinas
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Local</CardTitle>
            <CardDescription>Informações básicas do ponto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Local *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Shopping Center Norte"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-danger mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de Local</Label>
                <Select onValueChange={(value) => setValue('location_type', value as LocationFormData['location_type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">Escola</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="gym">Academia</SelectItem>
                    <SelectItem value="mall">Shopping</SelectItem>
                    <SelectItem value="bus_station">Rodoviária</SelectItem>
                    <SelectItem value="condominium">Condomínio</SelectItem>
                    <SelectItem value="university">Universidade</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Localização do ponto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address_street">Rua</Label>
                <Input
                  id="address_street"
                  placeholder="Nome da rua"
                  {...register('address_street')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  placeholder="123"
                  {...register('address_number')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address_complement">Complemento</Label>
                <Input
                  id="address_complement"
                  placeholder="Sala, andar, etc."
                  {...register('address_complement')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_neighborhood">Bairro</Label>
                <Input
                  id="address_neighborhood"
                  placeholder="Bairro"
                  {...register('address_neighborhood')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="address_city">Cidade</Label>
                <Input
                  id="address_city"
                  placeholder="Cidade"
                  {...register('address_city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_state">Estado</Label>
                <Input
                  id="address_state"
                  placeholder="SP"
                  maxLength={2}
                  {...register('address_state')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_zipcode">CEP</Label>
                <Input
                  id="address_zipcode"
                  placeholder="00000-000"
                  {...register('address_zipcode')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato do Local</CardTitle>
            <CardDescription>Responsável pelo ponto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome</Label>
                <Input
                  id="contact_name"
                  placeholder="Nome do contato"
                  {...register('contact_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  placeholder="(00) 00000-0000"
                  {...register('contact_phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="email@local.com"
                  {...register('contact_email')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contrato */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Contrato</CardTitle>
            <CardDescription>Informações comerciais (opcional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select onValueChange={(value) => setValue('contract_type', value as LocationFormData['contract_type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Aluguel Fixo</SelectItem>
                    <SelectItem value="commission">Comissão</SelectItem>
                    <SelectItem value="free">Comodato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contractType === 'rent' && (
                <div className="space-y-2">
                  <Label htmlFor="contract_value">Valor do Aluguel (R$)</Label>
                  <Input
                    id="contract_value"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    {...register('contract_value', { valueAsNumber: true })}
                  />
                </div>
              )}

              {contractType === 'commission' && (
                <div className="space-y-2">
                  <Label htmlFor="commission_percent">Comissão (%)</Label>
                  <Input
                    id="commission_percent"
                    type="number"
                    step="0.1"
                    placeholder="10"
                    {...register('commission_percent', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/app/locais">
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
              'Cadastrar Local'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
