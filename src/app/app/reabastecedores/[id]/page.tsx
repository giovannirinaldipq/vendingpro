'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Trash2, Send, Mail, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  async function sendInvite() {
    if (!r?.email) {
      toast.error('Cadastre um email antes de enviar o convite');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/app/restockers/${id}/invite`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        if (json.data?.action_url) {
          // Email não foi enviado — abre o dialog com o link pra copiar manualmente
          setInviteLink(json.data.action_url);
          setLinkCopied(false);
        } else {
          toast.success(json.data?.message ?? 'Convite enviado');
        }
      } else {
        toast.error(json.error?.message ?? 'Falha ao enviar convite');
      }
    } finally {
      setInviting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar — selecione o texto manualmente');
    }
  }

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
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
            </Button>
            <Button
              variant="outline"
              onClick={sendInvite}
              disabled={inviting || !r.email || !r.is_active}
              title={!r.email ? 'Adicione um email primeiro' : !r.is_active ? 'Reative o reabastecedor primeiro' : 'Envia link de acesso para o email cadastrado'}
            >
              {inviting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                : <><Send className="mr-2 h-4 w-4" />Enviar convite por email</>}
            </Button>
            <Button variant="ghost" onClick={deactivate} className="text-danger hover:text-danger ml-auto">
              <Trash2 className="mr-2 h-4 w-4" />Desativar
            </Button>
          </div>
          {r.email && (
            <p className="text-[11px] text-text-tertiary flex items-center gap-1 pt-1">
              <Mail className="h-3 w-3" />
              O convite manda um link mágico para <span className="font-medium">{r.email}</span> —
              ao clicar, o reabastecedor é levado direto para <code className="bg-surface-subtle px-1 rounded">/r/visitas</code>
            </p>
          )}
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

      <Dialog open={!!inviteLink} onOpenChange={(open) => { if (!open) setInviteLink(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Email não enviado — copie o link manualmente
            </DialogTitle>
            <DialogDescription>
              O serviço de email não está configurado neste ambiente. Copie o link abaixo
              e envie para <strong>{r?.email}</strong> via WhatsApp ou outro canal. Ao clicar,
              o reabastecedor entra direto no painel <code className="bg-surface-subtle px-1 rounded text-xs">/r/visitas</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-warning/30 bg-warning-soft/30 p-3">
              <p className="text-xs font-mono text-text-secondary break-all leading-relaxed">
                {inviteLink}
              </p>
            </div>
            <p className="text-[11px] text-text-tertiary">
              Esse link é válido por uma única utilização e expira em ~1 hora. Gere outro
              se necessário clicando em &ldquo;Enviar convite por email&rdquo; novamente.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setInviteLink(null)}>Fechar</Button>
            <Button onClick={copyLink} disabled={linkCopied}>
              {linkCopied
                ? <><Check className="mr-2 h-4 w-4" />Copiado!</>
                : <><Copy className="mr-2 h-4 w-4" />Copiar link</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
