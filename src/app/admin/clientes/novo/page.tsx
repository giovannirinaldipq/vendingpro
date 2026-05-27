'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Separator } from '@/components/ui/separator';
import { createTenantSchema, type CreateTenantFormInput } from '@/lib/validators';
import type { Plan } from '@/types';

function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export default function NewClientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetch('/api/admin/plans')
      .then(res => res.json())
      .then(result => {
        if (result.success) setPlans(result.data.filter((p: Plan) => p.is_active));
      });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTenantFormInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      document_type: 'cnpj',
      billing_day: 10,
      contracted_machines: 5,
    },
  });

  const documentType = watch('document_type');

  async function onSubmit(data: CreateTenantFormInput) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Cliente cadastrado com sucesso!');
        router.push('/admin/clientes');
      } else {
        toast.error(result.error?.message || 'Erro ao cadastrar cliente');
      }
    } catch {
      toast.error('Erro ao cadastrar cliente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/clientes">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Cliente</h1>
          <p className="text-muted-foreground">
            Cadastre um novo cliente na plataforma
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>Informações básicas do cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Razão Social *</Label>
                <Input
                  id="company_name"
                  placeholder="Nome da empresa"
                  {...register('company_name')}
                />
                {errors.company_name && (
                  <p className="text-xs text-danger mt-1">{errors.company_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="trade_name">Nome Fantasia</Label>
                <Input
                  id="trade_name"
                  placeholder="Nome fantasia"
                  {...register('trade_name')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Documento *</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => {
                    if (value === 'cpf' || value === 'cnpj') {
                      setValue('document_type', value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>{documentType === 'cnpj' ? 'CNPJ' : 'CPF'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_number">
                  {documentType === 'cnpj' ? 'CNPJ' : 'CPF'} *
                </Label>
                <Input
                  id="document_number"
                  placeholder={documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  maxLength={documentType === 'cnpj' ? 18 : 14}
                  {...register('document_number')}
                  onChange={(e) => {
                    const masked = documentType === 'cnpj' ? maskCNPJ(e.target.value) : maskCPF(e.target.value);
                    setValue('document_number', masked, { shouldValidate: true });
                    e.target.value = masked;
                  }}
                />
                {errors.document_number && (
                  <p className="text-xs text-danger mt-1">{errors.document_number.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato Principal</CardTitle>
            <CardDescription>Dados do responsável pela conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome *</Label>
                <Input
                  id="contact_name"
                  placeholder="Nome do contato"
                  {...register('contact_name')}
                />
                {errors.contact_name && (
                  <p className="text-xs text-danger mt-1">{errors.contact_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  {...register('contact_phone')}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setValue('contact_phone', masked);
                    e.target.value = masked;
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Email *</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="email@empresa.com"
                {...register('contact_email')}
              />
              {errors.contact_email && (
                <p className="text-xs text-danger mt-1">{errors.contact_email.message}</p>
              )}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="financial_email">Email Financeiro</Label>
                <Input
                  id="financial_email"
                  type="email"
                  placeholder="financeiro@empresa.com"
                  {...register('financial_email')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="financial_phone">Telefone Financeiro</Label>
                <Input
                  id="financial_phone"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  {...register('financial_phone')}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    setValue('financial_phone', masked);
                    e.target.value = masked;
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Endereço da empresa (opcional)</CardDescription>
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

        {/* Plano e Cobrança */}
        <Card>
          <CardHeader>
            <CardTitle>Plano e Cobrança</CardTitle>
            <CardDescription>Configurações de assinatura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select onValueChange={(value) => setValue('plan_id', value as string)}>
                  <SelectTrigger>
                    <SelectValue>
                      {watch('plan_id')
                        ? `${plans.find(p => p.id === watch('plan_id'))?.name ?? ''} · R$ ${plans.find(p => p.id === watch('plan_id'))?.price_per_machine ?? ''}/máquina`
                        : 'Selecione um plano'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} · R$ {plan.price_per_machine}/máquina
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_day">Dia de Cobrança</Label>
                <Select
                  defaultValue="10"
                  onValueChange={(value) => setValue('billing_day', parseInt(value as string))}
                >
                  <SelectTrigger>
                    <SelectValue>Dia {watch('billing_day') ?? 10}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 5, 10, 15, 20, 25].map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Dia {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contracted_machines">Máquinas Contratadas</Label>
                <Input
                  id="contracted_machines"
                  type="number"
                  min={1}
                  defaultValue={5}
                  {...register('contracted_machines', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">Limite de máquinas que o cliente pode cadastrar</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Origem</Label>
              <Select onValueChange={(value) => setValue('source', value as string)}>
                <SelectTrigger>
                  <SelectValue>
                    {watch('source')
                      ? { indicacao: 'Indicação', google: 'Google', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', outro: 'Outro' }[watch('source')!] ?? watch('source')
                      : 'Como o cliente chegou?'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/clientes">
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
              'Cadastrar Cliente'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
