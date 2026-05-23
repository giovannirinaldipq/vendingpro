'use client';

import { useState, useEffect } from 'react';
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
import type { Location } from '@/types';

const machineSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location_id: z.string().optional(),
  machine_type: z.enum(['snack', 'beverage', 'combo', 'coffee', 'other']).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  total_slots: z.number().int().positive().optional(),
  slot_capacity: z.number().int().positive().optional(),
  telemetry_system: z.enum(['vmpay', 'vendpago', 'other']).optional(),
  telemetry_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'installing', 'deactivated']),
});

type MachineFormData = z.infer<typeof machineSchema>;

export default function NewMachinePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetch('/api/app/locations')
      .then(res => res.json())
      .then(result => {
        if (result.success) setLocations(result.data.locations);
      });
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      status: 'active',
    },
  });

  async function onSubmit(data: MachineFormData) {
    setIsLoading(true);

    try {
      const response = await fetch('/api/app/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Máquina cadastrada com sucesso!');
        router.push('/app/maquinas');
      } else {
        toast.error(result.error?.message || 'Erro ao cadastrar máquina');
      }
    } catch {
      toast.error('Erro ao cadastrar máquina. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/maquinas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Máquina</h1>
          <p className="text-muted-foreground">
            Cadastre uma nova máquina de vending
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Dados básicos da máquina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="Ex: MAQ001"
                  {...register('code')}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Máquina Shopping Centro"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Local</Label>
                <Select onValueChange={(value) => setValue('location_id', value as string)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Máquina</Label>
                <Select onValueChange={(value) => setValue('machine_type', value as MachineFormData['machine_type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snack">Snacks</SelectItem>
                    <SelectItem value="beverage">Bebidas</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                    <SelectItem value="coffee">Café</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Especificações */}
        <Card>
          <CardHeader>
            <CardTitle>Especificações</CardTitle>
            <CardDescription>Detalhes técnicos (opcional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input
                  id="manufacturer"
                  placeholder="Ex: Crane, Necta, etc."
                  {...register('manufacturer')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  placeholder="Ex: Merchant 6"
                  {...register('model')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total_slots">Total de Canaletas</Label>
                <Input
                  id="total_slots"
                  type="number"
                  placeholder="Ex: 40"
                  {...register('total_slots', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot_capacity">Capacidade por Canaleta</Label>
                <Input
                  id="slot_capacity"
                  type="number"
                  placeholder="Ex: 10"
                  {...register('slot_capacity', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telemetria */}
        <Card>
          <CardHeader>
            <CardTitle>Telemetria</CardTitle>
            <CardDescription>Sistema de monitoramento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sistema de Telemetria</Label>
                <Select onValueChange={(value) => setValue('telemetry_system', value as MachineFormData['telemetry_system'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vmpay">VM PAY</SelectItem>
                    <SelectItem value="vendpago">VendPago</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telemetry_id">ID na Telemetria</Label>
                <Input
                  id="telemetry_id"
                  placeholder="ID usado no sistema de telemetria"
                  {...register('telemetry_id')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Situação atual da máquina</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Status Operacional</Label>
              <Select defaultValue="active" onValueChange={(value) => setValue('status', value as MachineFormData['status'])}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="installing">Em Instalação</SelectItem>
                  <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/app/maquinas">
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
              'Cadastrar Máquina'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
