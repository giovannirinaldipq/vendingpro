'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface MachineCost {
  id: string;
  machine_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'one_time';
  start_date: string;
  machine?: { name: string; code: string } | null;
}

interface Machine { id: string; name: string; code: string; }

const COST_TYPES = [
  { value: 'rent', label: 'Aluguel' },
  { value: 'telemetry', label: 'Telemetria' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'other', label: 'Outro' },
];
const COST_LABEL: Record<string, string> = Object.fromEntries(COST_TYPES.map(c => [c.value, c.label]));
const FREQ_LABEL: Record<string, string> = { monthly: 'Mensal', yearly: 'Anual', one_time: 'Único' };
const fmtBRL = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function CostsContent() {
  const sp = useSearchParams();
  const filterMachine = sp.get('machine_id');
  const [costs, setCosts] = useState<MachineCost[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    machine_id: filterMachine ?? '',
    cost_type: 'rent',
    description: '',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (filterMachine) sp.set('machine_id', filterMachine);
      const [c, m] = await Promise.all([
        fetch(`/api/app/machine-costs?${sp}`).then(r => r.json()),
        fetch('/api/app/machines').then(r => r.json()),
      ]);
      setCosts(c.data ?? []);
      setMachines(m.data?.machines ?? m.data ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterMachine]);

  async function submit() {
    if (!form.machine_id || !form.amount) return toast.error('Preencha máquina e valor');
    setSaving(true);
    try {
      const res = await fetch('/api/app/machine-costs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: form.machine_id,
          cost_type: form.cost_type,
          description: form.description || undefined,
          amount: Number(form.amount),
          frequency: form.frequency,
          start_date: form.start_date,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Custo adicionado');
        setShowForm(false);
        setForm({ ...form, description: '', amount: '' });
        load();
      } else toast.error(json.error ?? 'Falha');
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Remover este custo?')) return;
    const res = await fetch(`/api/app/machine-costs/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Removido'); load(); }
    else toast.error('Falha ao remover');
  }

  return (
    <div className="space-y-6">
      <Link href="/app/financeiro" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao Financeiro
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custos fixos</h1>
          <p className="text-sm text-muted-foreground">Aluguel, telemetria, seguros e manutenção atribuídos a cada máquina.</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}><Plus className="mr-2 h-4 w-4" />Novo custo</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Adicionar custo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select value={form.machine_id} onValueChange={v => v && setForm({ ...form, machine_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.cost_type} onValueChange={v => v && setForm({ ...form, cost_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.frequency} onValueChange={v => v && setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição (opcional)</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</> : 'Adicionar'}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Custos ativos</CardTitle><CardDescription>{costs.length} custo{costs.length === 1 ? '' : 's'}</CardDescription></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : costs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum custo cadastrado{filterMachine ? ' para esta máquina' : ''}.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.machine?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{COST_LABEL[c.cost_type] ?? c.cost_type}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{c.description ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(c.amount)}</TableCell>
                    <TableCell>{FREQ_LABEL[c.frequency]}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-danger" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CostsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <CostsContent />
    </Suspense>
  );
}
