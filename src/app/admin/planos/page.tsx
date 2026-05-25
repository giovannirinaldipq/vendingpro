'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Check, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_per_machine: number;
  minimum_value: number;
  minimum_machines: number;
  trial_days: number;
  features: string[];
  limits: Record<string, number | null>;
  is_active: boolean;
  clients_count?: number;
}

const FEATURE_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'dashboard',    label: 'Dashboard' },
  { slug: 'heatmap',      label: 'Mapa de Calor' },
  { slug: 'ranking',      label: 'Rankings' },
  { slug: 'products',     label: 'Análise de Produtos' },
  { slug: 'alerts',       label: 'Alertas' },
  { slug: 'restocking',   label: 'Gestão de Reabastecedor' },
  { slug: 'suggestions',  label: 'Sugestões Automáticas' },
  { slug: 'financial',    label: 'Controle Financeiro' },
  { slug: 'inventory',    label: 'Estoque Central' },
  { slug: 'conciliation', label: 'Conciliação Bancária' },
  { slug: 'reports',      label: 'Relatórios' },
];

interface PlanFormState {
  id?: string;
  name: string;
  slug: string;
  price_per_machine: number;
  minimum_value: number;
  minimum_machines: number;
  trial_days: number;
  features: string[];
  max_machines: number | null;
  max_users: number | null;
  max_restockers: number | null;
  history_months: number | null;
  is_active: boolean;
}

function emptyForm(): PlanFormState {
  return {
    name: '', slug: '',
    price_per_machine: 29,
    minimum_value: 99,
    minimum_machines: 1,
    trial_days: 14,
    features: ['dashboard', 'heatmap', 'ranking', 'products'],
    max_machines: null, max_users: null, max_restockers: null, history_months: null,
    is_active: true,
  };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PlanFormState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const json = await res.json();
      if (json.success) setPlans(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(emptyForm());
  }
  function openEdit(p: Plan) {
    setEditing({
      id: p.id, name: p.name, slug: p.slug,
      price_per_machine: Number(p.price_per_machine),
      minimum_value: Number(p.minimum_value),
      minimum_machines: p.minimum_machines,
      trial_days: p.trial_days,
      features: p.features ?? [],
      max_machines: p.limits?.max_machines ?? null,
      max_users: p.limits?.max_users ?? null,
      max_restockers: p.limits?.max_restockers ?? null,
      history_months: p.limits?.history_months ?? null,
      is_active: p.is_active,
    });
  }
  function closeForm() { setEditing(null); }

  async function deletePlan(p: Plan) {
    if (!confirm(`Excluir o plano "${p.name}"? ${p.clients_count ? `Há ${p.clients_count} clientes vinculados — o plano será apenas desativado.` : ''}`)) return;
    const res = await fetch(`/api/admin/plans/${p.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      toast.success(json.data?.soft_deleted ? 'Plano desativado (tinha clientes vinculados)' : 'Plano excluído');
      load();
    } else {
      toast.error(json.error?.message ?? 'Falha');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">Catálogo de planos de assinatura</p>
        </div>
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) closeForm(); }}>
          <DialogTrigger render={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo plano</Button>} />
          {editing && (
            <PlanFormDialog
              initial={editing}
              onSaved={() => { closeForm(); load(); }}
              onCancel={closeForm}
            />
          )}
        </Dialog>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum plano cadastrado ainda. <button onClick={openCreate} className="text-brand-navy underline">Crie o primeiro</button>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {!plan.is_active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    </CardTitle>
                    <p className="text-xs text-text-tertiary mt-0.5 font-mono">{plan.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-danger" onClick={() => deletePlan(plan)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  <span className="text-3xl font-bold text-foreground">R$ {Number(plan.price_per_machine).toLocaleString('pt-BR')}</span>
                  <span className="text-muted-foreground">/máquina/mês</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Row label="Mínimo mensal" value={`R$ ${Number(plan.minimum_value).toLocaleString('pt-BR')}`} />
                <Row label="Mínimo de máquinas" value={String(plan.minimum_machines)} />
                <Row label="Trial" value={`${plan.trial_days} dias`} />
                <Row label="Clientes ativos" value={<Badge variant="secondary">{plan.clients_count ?? 0}</Badge>} />

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Limites</p>
                  <div className="space-y-1 text-sm">
                    <Row label="Máquinas" value={plan.limits?.max_machines ?? 'Ilimitado'} muted />
                    <Row label="Usuários" value={plan.limits?.max_users ?? 'Ilimitado'} muted />
                    <Row label="Reabastecedores" value={plan.limits?.max_restockers ?? 'Ilimitado'} muted />
                    <Row label="Histórico" value={plan.limits?.history_months ? `${plan.limits.history_months} meses` : 'Ilimitado'} muted />
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium">Funcionalidades</p>
                  {FEATURE_OPTIONS.map(f => (
                    <div key={f.slug} className="flex items-center gap-2 text-sm">
                      {plan.features?.includes(f.slug) ? (
                        <Check className="h-4 w-4 text-brand-amber" strokeWidth={2.5} />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={plan.features?.includes(f.slug) ? '' : 'text-muted-foreground'}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? 'text-text-secondary' : 'font-medium'}>{value}</span>
    </div>
  );
}

function PlanFormDialog({
  initial, onSaved, onCancel,
}: { initial: PlanFormState; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<PlanFormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!initial.id;

  function toggleFeature(slug: string) {
    setForm(f => ({
      ...f,
      features: f.features.includes(slug)
        ? f.features.filter(x => x !== slug)
        : [...f.features, slug],
    }));
  }

  async function submit() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Nome e slug obrigatórios');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      toast.error('Slug deve ter só minúsculas, números e hífen');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        price_per_machine: Number(form.price_per_machine),
        minimum_value: Number(form.minimum_value),
        minimum_machines: Number(form.minimum_machines),
        trial_days: Number(form.trial_days),
        features: form.features,
        limits: {
          max_machines: form.max_machines,
          max_users: form.max_users,
          max_restockers: form.max_restockers,
          history_months: form.history_months,
        },
        is_active: form.is_active,
      };
      const res = await fetch(isEdit ? `/api/admin/plans/${initial.id}` : '/api/admin/plans', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? 'Plano atualizado' : 'Plano criado');
        onSaved();
      } else {
        toast.error(json.error?.message ?? 'Falha');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Editar plano' : 'Novo plano'}</DialogTitle>
        <DialogDescription>Define preço, limites e funcionalidades</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="plan-name">Nome *</Label>
            <Input id="plan-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Profissional" />
          </div>
          <div>
            <Label htmlFor="plan-slug">Slug *</Label>
            <Input id="plan-slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="profissional" disabled={isEdit} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="plan-price">Preço/máquina (R$)</Label>
            <Input id="plan-price" type="number" step="0.01" min="0" value={form.price_per_machine} onChange={e => setForm({ ...form, price_per_machine: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="plan-min">Mínimo mensal (R$)</Label>
            <Input id="plan-min" type="number" step="0.01" min="0" value={form.minimum_value} onChange={e => setForm({ ...form, minimum_value: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="plan-trial">Trial (dias)</Label>
            <Input id="plan-trial" type="number" min="0" value={form.trial_days} onChange={e => setForm({ ...form, trial_days: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Limites (deixe em branco para ilimitado)</Label>
          <div className="grid gap-3 sm:grid-cols-4">
            {(['max_machines', 'max_users', 'max_restockers', 'history_months'] as const).map(key => (
              <div key={key}>
                <Label htmlFor={`plan-${key}`} className="text-xs text-text-tertiary">
                  {key === 'max_machines' ? 'Máquinas' : key === 'max_users' ? 'Usuários' : key === 'max_restockers' ? 'Reabastecedores' : 'Histórico (meses)'}
                </Label>
                <Input
                  id={`plan-${key}`}
                  type="number"
                  min="0"
                  value={form[key] ?? ''}
                  onChange={e => setForm({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="∞"
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Funcionalidades incluídas</Label>
          <div className="grid grid-cols-2 gap-2">
            {FEATURE_OPTIONS.map(f => (
              <label key={f.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.features.includes(f.slug)}
                  onChange={() => toggleFeature(f.slug)}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <div>
            <p className="font-medium text-sm">Plano ativo</p>
            <p className="text-xs text-muted-foreground">Inativo não aparece para novos clientes</p>
          </div>
          <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {isEdit ? 'Salvar' : 'Criar plano'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
