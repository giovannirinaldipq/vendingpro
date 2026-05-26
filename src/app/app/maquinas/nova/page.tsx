'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import type { Location } from '@/types';

const machineSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location_id: z.string().optional(),
  machine_type: z.enum(['snack_beverage', 'coffee', 'other']).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  total_slots: z.number().int().positive().optional(),
  slot_capacity: z.number().int().positive().optional(),
  telemetry_system: z.enum(['vmpay', 'vendpago', 'other']).optional(),
  telemetry_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'installing', 'deactivated']),
});

type MachineFormData = z.infer<typeof machineSchema>;

const LOCATION_TYPES: { value: string; label: string }[] = [
  { value: 'company', label: 'Empresa' },
  { value: 'school', label: 'Escola' },
  { value: 'university', label: 'Universidade' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'gym', label: 'Academia' },
  { value: 'mall', label: 'Shopping' },
  { value: 'bus_station', label: 'Rodoviária' },
  { value: 'condominium', label: 'Condomínio' },
  { value: 'other', label: 'Outro' },
];

const MACHINE_TYPE_LABELS: Record<string, string> = {
  snack_beverage: 'Snacks e Bebidas',
  coffee: 'Café',
  other: 'Outro',
};

const TELEMETRY_LABELS: Record<string, string> = {
  vmpay: 'VM PAY',
  vendpago: 'VendPago',
  other: 'Outro',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  installing: 'Em Instalação',
  maintenance: 'Em Manutenção',
  inactive: 'Inativa',
};

export default function NewMachinePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedMachineType, setSelectedMachineType] = useState<string>('');
  const [selectedTelemetry, setSelectedTelemetry] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  // Dialog "criar local rápido"
  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocType, setNewLocType] = useState<string>('company');
  const [creatingLoc, setCreatingLoc] = useState(false);

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

  const loadLocations = useCallback(async (selectId?: string) => {
    const r = await fetch('/api/app/locations');
    const j = await r.json();
    if (j.success) {
      setLocations(j.data.locations);
      if (selectId) {
        setSelectedLocationId(selectId);
        setValue('location_id', selectId);
      }
    }
  }, [setValue]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function createLocationInline() {
    if (!newLocName.trim() || newLocName.trim().length < 2) {
      toast.error('Nome do local precisa ter ao menos 2 caracteres');
      return;
    }
    setCreatingLoc(true);
    try {
      const res = await fetch('/api/app/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName.trim(),
          location_type: newLocType || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Local "${json.data.name}" criado`);
        await loadLocations(json.data.id);
        setLocDialogOpen(false);
        setNewLocName('');
        setNewLocType('company');
      } else {
        toast.error(json.error?.message ?? 'Falha ao criar local');
      }
    } finally {
      setCreatingLoc(false);
    }
  }

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
          <Button variant="ghost" size="icon" aria-label="Voltar">
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
                  <p className="text-xs text-danger mt-1">{errors.code.message}</p>
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
                  <p className="text-xs text-danger mt-1">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Local</Label>
                <Select
                  value={selectedLocationId}
                  onValueChange={(value) => {
                    const v = value ?? '';
                    setSelectedLocationId(v);
                    setValue('location_id', v || undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={locations.length === 0 ? 'Nenhum local cadastrado' : 'Selecione o local'}>
                      {selectedLocationId
                        ? locations.find(l => l.id === selectedLocationId)?.name
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setLocDialogOpen(true)}
                  className="text-xs font-medium text-brand-navy hover:underline inline-flex items-center gap-1 pt-0.5"
                >
                  <Plus className="h-3 w-3" />Criar novo local
                </button>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Máquina</Label>
                <Select
                  value={selectedMachineType}
                  onValueChange={(value) => {
                    const v = (value ?? '') as MachineFormData['machine_type'] | '';
                    setSelectedMachineType(v ?? '');
                    setValue('machine_type', v || undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo">
                      {selectedMachineType ? MACHINE_TYPE_LABELS[selectedMachineType] : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snack_beverage">Snacks e Bebidas</SelectItem>
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
                <Select
                  value={selectedTelemetry}
                  onValueChange={(value) => {
                    const v = (value ?? '') as MachineFormData['telemetry_system'] | '';
                    setSelectedTelemetry(v ?? '');
                    setValue('telemetry_system', v || undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o sistema">
                      {selectedTelemetry ? TELEMETRY_LABELS[selectedTelemetry] : null}
                    </SelectValue>
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
              <Select
                value={selectedStatus}
                onValueChange={(value) => {
                  const v = (value ?? 'active') as MachineFormData['status'];
                  setSelectedStatus(v);
                  setValue('status', v);
                }}
              >
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue>
                    {STATUS_LABELS[selectedStatus] ?? 'Ativa'}
                  </SelectValue>
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

      {/* Dialog: criar local inline (sem sair do form) */}
      <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo local</DialogTitle>
            <DialogDescription>
              Cadastro rápido — você pode completar endereço, contato e contrato depois em Locais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newLocName">Nome do local *</Label>
              <Input
                id="newLocName"
                placeholder="Ex: Empresa XYZ — Recepção"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newLocType} onValueChange={(v) => setNewLocType(v ?? 'company')}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {LOCATION_TYPES.find(t => t.value === newLocType)?.label ?? 'Empresa'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setLocDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={createLocationInline} disabled={creatingLoc}>
              {creatingLoc
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>
                : 'Criar e selecionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
