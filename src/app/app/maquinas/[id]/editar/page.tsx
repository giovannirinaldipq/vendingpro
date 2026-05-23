'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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

const machineSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  machine_type: z.enum(['snack', 'beverage', 'combo', 'coffee', 'other']),
  location_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']),
});

type MachineFormData = z.infer<typeof machineSchema>;

interface Location {
  id: string;
  name: string;
}

export default function EditMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MachineFormData>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      machine_type: 'snack',
      status: 'active',
    },
  });

  const currentType = watch('machine_type');
  const currentLocation = watch('location_id');
  const currentStatus = watch('status');

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar locais
        const locationsRes = await fetch('/api/app/locations');
        const locationsResult = await locationsRes.json();
        if (locationsResult.success) {
          setLocations(locationsResult.data.locations || []);
        }

        // Buscar dados da máquina
        const machineRes = await fetch(`/api/app/machines/${id}`);
        const machineResult = await machineRes.json();

        if (machineResult.success) {
          const machine = machineResult.data;
          reset({
            code: machine.code,
            name: machine.name,
            machine_type: machine.machine_type || 'snack',
            location_id: machine.location_id || '',
            status: machine.status || 'active',
          });
        } else {
          toast.error('Máquina não encontrada');
          router.push('/app/maquinas');
        }
      } catch {
        toast.error('Erro ao carregar dados');
        router.push('/app/maquinas');
      } finally {
        setIsFetching(false);
      }
    }

    fetchData();
  }, [id, reset, router]);

  async function onSubmit(data: MachineFormData) {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/app/machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          location_id: data.location_id || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Máquina atualizada com sucesso!');
        router.push(`/app/maquinas/${id}`);
      } else {
        toast.error(result.error?.message || 'Erro ao atualizar máquina');
      }
    } catch {
      toast.error('Erro ao atualizar máquina. Tente novamente.');
    } finally {
      setIsLoading(false);
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
      <div className="flex items-center gap-4">
        <Link href={`/app/maquinas/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Máquina</h1>
          <p className="text-muted-foreground">
            Atualize as informações da máquina
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Máquina</CardTitle>
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
                  placeholder="Ex: Máquina Recepção"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={currentType}
                  onValueChange={(value) => setValue('machine_type', value as MachineFormData['machine_type'])}
                >
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

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(value) => setValue('status', value as MachineFormData['status'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                    <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Local</Label>
              <Select
                value={currentLocation || ''}
                onValueChange={(value) => setValue('location_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem local</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href={`/app/maquinas/${id}`}>
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
