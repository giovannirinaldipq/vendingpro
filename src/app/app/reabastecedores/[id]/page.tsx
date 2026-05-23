'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface Restocker {
  id: string;
  name: string;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  pin_code: string | null;
  is_active: boolean;
}

interface Machine {
  id: string;
  name: string;
  code: string;
  status: string;
  location?: { name: string } | null;
}

export default function EditRestockerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Restocker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savingAssign, setSavingAssign] = useState(false);

  useEffect(() => {
    (async () => {
      const [resR, resMs, resAssigned] = await Promise.all([
        fetch(`/api/app/restockers/${id}`),
        fetch('/api/app/machines'),
        fetch(`/api/app/restockers/${id}/machines`),
      ]);
      const jsonR = await resR.json();
      const jsonMs = await resMs.json();
      const jsonAssigned = await resAssigned.json();

      if (jsonR.data) setR(jsonR.data);
      // /api/app/machines pode retornar { success, data: { machines: [...] } } ou similar
      const ms = jsonMs.data?.machines ?? jsonMs.data ?? [];
      setAllMachines(Array.isArray(ms) ? ms : []);
      const assignedIds = new Set<string>((jsonAssigned.data ?? []).map((m: Machine) => m.id));
      setSelected(assignedIds);

      setLoading(false);
    })();
  }, [id]);

  async function save() {
    if (!r) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/app/restockers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: r.name,
          phone: r.phone,
          email: r.email,
          document_number: r.document_number,
          vehicle_plate: r.vehicle_plate,
          vehicle_model: r.vehicle_model,
          pin_code: r.pin_code,
          is_active: r.is_active,
        }),
      });
      if (res.ok) toast.success('Salvo'); else toast.error('Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignments() {
    setSavingAssign(true);
    try {
      const res = await fetch(`/api/app/restockers/${id}/machines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_ids: Array.from(selected) }),
      });
      if (res.ok) toast.success('Máquinas atribuídas'); else toast.error('Falha');
    } finally {
      setSavingAssign(false);
    }
  }

  async function deactivate() {
    if (!confirm('Desativar este reabastecedor? Ele não poderá mais ser atribuído a máquinas.')) return;
    const res = await fetch(`/api/app/restockers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Desativado');
      router.push('/app/reabastecedores');
    } else toast.error('Falha');
  }

  function toggle(machineId: string) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(machineId)) next.delete(machineId);
      else next.add(machineId);
      return next;
    });
  }

  if (loading || !r) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/app/reabastecedores" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{r.name}</span>
            {!r.is_active && <Badge className="bg-gray-200 text-gray-700">Inativo</Badge>}
          </CardTitle>
          <CardDescription>Dados do reabastecedor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={r.name} onChange={e => setR({ ...r, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={r.document_number ?? ''} onChange={e => setR({ ...r, document_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={r.phone ?? ''} onChange={e => setR({ ...r, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={r.email ?? ''} onChange={e => setR({ ...r, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input value={r.vehicle_plate ?? ''} onChange={e => setR({ ...r, vehicle_plate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Input value={r.vehicle_model ?? ''} onChange={e => setR({ ...r, vehicle_model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>PIN (4-6 dígitos)</Label>
              <Input value={r.pin_code ?? ''} onChange={e => setR({ ...r, pin_code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ativo</Label>
              <div className="flex items-center h-9">
                <Switch checked={r.is_active} onCheckedChange={v => setR({ ...r, is_active: v })} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
            </Button>
            <Button variant="outline" onClick={deactivate} className="text-red-600 hover:text-red-700">
              <Trash2 className="mr-2 h-4 w-4" />Desativar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Máquinas atribuídas</CardTitle>
          <CardDescription>Marque as máquinas que este reabastecedor cuida. Selecionadas: {selected.size}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allMachines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma máquina cadastrada ainda.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {allMachines.map(m => (
                <label key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.name} <span className="text-muted-foreground text-xs">({m.code})</span></div>
                    {m.location?.name && <div className="text-xs text-muted-foreground">{m.location.name}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}
          <Separator />
          <Button onClick={saveAssignments} disabled={savingAssign}>
            {savingAssign ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</> : <><Save className="mr-2 h-4 w-4" />Salvar atribuições</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
