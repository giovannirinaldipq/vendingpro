'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const locationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location_type: z.enum(['school', 'company', 'hospital', 'gym', 'mall', 'bus_station', 'condominium', 'university', 'other']).optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_number: z.string().optional().nullable(),
  address_complement: z.string().optional().nullable(),
  address_neighborhood: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().max(2).optional().nullable(),
  address_zipcode: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  contract_type: z.enum(['rent', 'commission', 'free']).optional().nullable(),
  contract_value: z.number().optional().nullable(),
  commission_percent: z.number().min(0).max(100).optional().nullable(),
  contract_start_date: z.string().optional().nullable(),
  contract_end_date: z.string().optional().nullable(),
});

type LocationFormData = z.infer<typeof locationSchema>;

const LOCATION_TYPE_LABELS: Record<string, string> = {
  school: 'Escola',
  company: 'Empresa',
  hospital: 'Hospital',
  gym: 'Academia',
  mall: 'Shopping',
  bus_station: 'Rodoviária',
  condominium: 'Condomínio',
  university: 'Universidade',
  other: 'Outro',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  rent: 'Aluguel Fixo',
  commission: 'Comissão',
  free: 'Comodato',
};

export default function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
  });

  const contractType = watch('contract_type');
  const locationType = watch('location_type');

  useEffect(() => {
    async function fetchLocation() {
      try {
        const response = await fetch(`/api/app/locations/${id}`);
        const result = await response.json();

        if (result.success) {
          reset({
            name: result.data.name,
            location_type: result.data.location_type,
            address_street: result.data.address_street || '',
            address_number: result.data.address_number || '',
            address_complement: result.data.address_complement || '',
            address_neighborhood: result.data.address_neighborhood || '',
            address_city: result.data.address_city || '',
            address_state: result.data.address_state || '',
            address_zipcode: result.data.address_zipcode || '',
            contact_name: result.data.contact_name || '',
            contact_phone: result.data.contact_phone || '',
            contact_email: result.data.contact_email || '',
            contract_type: result.data.contract_type,
            contract_value: result.data.contract_value,
            commission_percent: result.data.commission_percent,
            contract_start_date: result.data.contract_start_date?.slice(0, 10) || '',
            contract_end_date: result.data.contract_end_date?.slice(0, 10) || '',
          });
        } else {
          toast.error('Local não encontrado');
          router.push('/app/locais');
        }
      } catch {
        toast.error('Erro ao carregar local');
        router.push('/app/locais');
      } finally {
        setIsFetching(false);
      }
    }

    fetchLocation();
  }, [id, reset, router]);

  async function onSubmit(data: LocationFormData) {
    setIsLoading(true);

    try {
      // Normaliza datas vazias pra null
      const payload = {
        ...data,
        contract_start_date: data.contract_start_date || null,
        contract_end_date: data.contract_end_date || null,
        contact_email: data.contact_email || null,
      };

      const response = await fetch(`/api/app/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Local atualizado com sucesso!');
        router.push('/app/locais');
      } else {
        toast.error(result.error?.message || 'Erro ao atualizar local');
      }
    } catch {
      toast.error('Erro ao atualizar local. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/app/locations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Local excluído com sucesso!');
        router.push('/app/locais');
      } else {
        toast.error(result.error?.message || 'Erro ao excluir local');
      }
    } catch {
      toast.error('Erro ao excluir local. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (isFetching) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/locais">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Local</h1>
            <p className="text-muted-foreground">
              Atualize as informações do ponto comercial
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir local?</AlertDialogTitle>
              <AlertDialogDescription>
                O local será arquivado. Máquinas vinculadas continuam funcionando mas ficam sem ponto.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-danger hover:bg-danger/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <Select
                  value={locationType ?? ''}
                  onValueChange={(value) => setValue('location_type', (value || null) as LocationFormData['location_type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo">
                      {locationType ? LOCATION_TYPE_LABELS[locationType] : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Localização do ponto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address_street">Rua</Label>
                <Input id="address_street" placeholder="Nome da rua" {...register('address_street')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input id="address_number" placeholder="123" {...register('address_number')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address_complement">Complemento</Label>
                <Input id="address_complement" placeholder="Sala, andar, etc." {...register('address_complement')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_neighborhood">Bairro</Label>
                <Input id="address_neighborhood" placeholder="Bairro" {...register('address_neighborhood')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="address_city">Cidade</Label>
                <Input id="address_city" placeholder="Cidade" {...register('address_city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_state">Estado</Label>
                <Input id="address_state" placeholder="SP" maxLength={2} {...register('address_state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_zipcode">CEP</Label>
                <Input id="address_zipcode" placeholder="00000-000" {...register('address_zipcode')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato do Local</CardTitle>
            <CardDescription>Responsável pelo ponto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome</Label>
                <Input id="contact_name" placeholder="Nome do contato" {...register('contact_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input id="contact_phone" placeholder="(00) 00000-0000" {...register('contact_phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" type="email" placeholder="email@local.com" {...register('contact_email')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Contrato</CardTitle>
            <CardDescription>Informações comerciais e vigência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select
                  value={contractType ?? ''}
                  onValueChange={(value) => setValue('contract_type', (value || null) as LocationFormData['contract_type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {contractType ? CONTRACT_TYPE_LABELS[contractType] : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contract_start_date">Início do contrato</Label>
                <Input id="contract_start_date" type="date" {...register('contract_start_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract_end_date">Fim do contrato</Label>
                <Input id="contract_end_date" type="date" {...register('contract_end_date')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/app/locais">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
