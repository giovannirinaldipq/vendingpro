'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { User, Building2, Bell, Shield, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface AlertSettings {
  tenant_id: string;
  machine_stopped_hours: number;
  sales_drop_threshold_percent: number;
  sales_drop_period_days: number;
  rupture_estimate_days: number;
  product_stale_days: number;
  contract_expiring_days: number;
  email_enabled: boolean;
  email_min_severity: Severity;
  email_recipients: string[] | null;
}

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'low', label: 'Baixa — qualquer alerta' },
  { value: 'medium', label: 'Média — alertas significativos' },
  { value: 'high', label: 'Alta — só problemas sérios' },
  { value: 'critical', label: 'Crítica — só emergências' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipientsText, setRecipientsText] = useState('');

  useEffect(() => {
    fetch('/api/app/alert-settings')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setSettings(json.data);
          setRecipientsText((json.data.email_recipients ?? []).join(', '));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) {
    setSettings(s => s ? { ...s, [key]: value } : s);
  }

  async function saveAlertSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const recipients = recipientsText
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(Boolean);

      const body = {
        machine_stopped_hours: settings.machine_stopped_hours,
        sales_drop_threshold_percent: settings.sales_drop_threshold_percent,
        sales_drop_period_days: settings.sales_drop_period_days,
        rupture_estimate_days: settings.rupture_estimate_days,
        product_stale_days: settings.product_stale_days,
        contract_expiring_days: settings.contract_expiring_days,
        email_enabled: settings.email_enabled,
        email_min_severity: settings.email_min_severity,
        email_recipients: recipients.length > 0 ? recipients : null,
      };
      const res = await fetch('/api/app/alert-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Configurações salvas');
        setSettings(json.data);
      } else {
        toast.error(json.error ?? 'Falha ao salvar');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e dados da conta</p>
      </div>

      {/* Alertas automáticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas automáticos
          </CardTitle>
          <CardDescription>
            Configure quando o sistema deve criar alertas e te notificar por email. O motor roda 1×/dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading || !settings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Máquina parada (horas sem venda)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={240}
                    value={settings.machine_stopped_hours}
                    onChange={e => update('machine_stopped_hours', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Padrão: 24h</p>
                </div>
                <div className="space-y-2">
                  <Label>Queda de vendas (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.sales_drop_threshold_percent}
                    onChange={e => update('sales_drop_threshold_percent', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Compara últimos {settings.sales_drop_period_days} dias com período anterior
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Período de comparação (dias)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={90}
                    value={settings.sales_drop_period_days}
                    onChange={e => update('sales_drop_period_days', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ruptura iminente (dias de estoque)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.rupture_estimate_days}
                    onChange={e => update('rupture_estimate_days', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Alerta quando estoque acabar em até N dias</p>
                </div>
                <div className="space-y-2">
                  <Label>Produto encalhado (dias sem vender)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={180}
                    value={settings.product_stale_days}
                    onChange={e => update('product_stale_days', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contrato vencendo (antecedência em dias)</Label>
                  <Input
                    type="number"
                    min={7}
                    max={180}
                    value={settings.contract_expiring_days}
                    onChange={e => update('contract_expiring_days', Number(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificar por email</p>
                    <p className="text-sm text-muted-foreground">
                      Quando um alerta for criado pelo motor, mandar email para a equipe
                    </p>
                  </div>
                  <Switch
                    checked={settings.email_enabled}
                    onCheckedChange={v => update('email_enabled', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Severidade mínima para notificar</Label>
                  <Select
                    value={settings.email_min_severity}
                    onValueChange={v => update('email_min_severity', v as Severity)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destinatários (deixe vazio para todos os usuários do tenant)</Label>
                  <Input
                    placeholder="email1@empresa.com, email2@empresa.com"
                    value={recipientsText}
                    onChange={e => setRecipientsText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe múltiplos emails por vírgula. Vazio = todos os usuários ativos.
                  </p>
                </div>
              </div>

              <Button onClick={saveAlertSettings} disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar configurações de alerta</>}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile (mock) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />Perfil
          </CardTitle>
          <CardDescription>Seus dados pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" disabled />
            </div>
          </div>
          <Button disabled>Salvar Alterações</Button>
          <p className="text-xs text-muted-foreground">Edição de perfil em breve.</p>
        </CardContent>
      </Card>

      {/* Company (mock) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />Empresa
          </CardTitle>
          <CardDescription>Dados da sua empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Para alterar dados da empresa, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />Segurança
          </CardTitle>
          <CardDescription>Configurações de segurança da conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alterar Senha</p>
              <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
            </div>
            <a href="/forgot-password"><Button variant="outline" size="sm">Alterar</Button></a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
