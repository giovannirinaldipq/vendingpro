'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Settings {
  company_name: string | null;
  company_cnpj: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  default_trial_days: number;
  billing_reminder_days_before: number;
  billing_first_overdue_reminder_days: number;
  billing_suspension_days: number;
  billing_cancellation_days: number;
}

interface IntegrationsStatus {
  asaas: { configured: boolean; env: string | null; webhook_configured: boolean };
  resend: { configured: boolean; from: string | null };
  twilio_whatsapp: { configured: boolean; from: string | null };
  cron: { configured: boolean };
  supabase: { configured: boolean; url: string | null };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/platform-settings');
      const json = await res.json();
      if (json.success) {
        setSettings(json.data.settings);
        setStatus(json.data.integrations_status);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) toast.success('Configurações salvas');
      else toast.error(json.error?.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings(s => s ? ({ ...s, [key]: val }) : s);
  }

  if (loading || !settings) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Ajustes globais da plataforma VendingPro</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="billing">Cobrança</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da empresa</CardTitle>
              <CardDescription>Aparecem em faturas e emails enviados aos clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome da empresa" value={settings.company_name ?? ''} onChange={v => update('company_name', v)} />
                <Field label="CNPJ" value={settings.company_cnpj ?? ''} onChange={v => update('company_cnpj', v || null)} />
              </div>
              <Field label="Endereço" value={settings.company_address ?? ''} onChange={v => update('company_address', v || null)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email de contato" value={settings.company_email ?? ''} onChange={v => update('company_email', v || null)} type="email" />
                <Field label="Telefone" value={settings.company_phone ?? ''} onChange={v => update('company_phone', v || null)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trial padrão</CardTitle>
              <CardDescription>Período de teste oferecido a novos clientes (cada plano pode sobrescrever)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="trial_days">Dias de trial</Label>
                <Input
                  id="trial_days"
                  type="number"
                  min="0"
                  max="365"
                  value={settings.default_trial_days}
                  onChange={e => update('default_trial_days', Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Régua de cobrança</CardTitle>
              <CardDescription>Define quando o sistema envia lembretes e suspende clientes em atraso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumField
                  label="Lembrete antes do vencimento"
                  hint="Dias antes da data de vencimento"
                  value={settings.billing_reminder_days_before}
                  onChange={v => update('billing_reminder_days_before', v)}
                  min={0} max={30}
                />
                <NumField
                  label="Primeiro lembrete de atraso"
                  hint="Dias após vencer sem pagar"
                  value={settings.billing_first_overdue_reminder_days}
                  onChange={v => update('billing_first_overdue_reminder_days', v)}
                  min={0} max={30}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumField
                  label="Suspender após (dias de atraso)"
                  hint="Bloqueia o acesso do cliente ao /app"
                  value={settings.billing_suspension_days}
                  onChange={v => update('billing_suspension_days', v)}
                  min={0} max={180}
                />
                <NumField
                  label="Cancelar após (dias de atraso)"
                  hint="Marca conta como cancelada (mantém dados)"
                  value={settings.billing_cancellation_days}
                  onChange={v => update('billing_cancellation_days', v)}
                  min={0} max={365}
                />
              </div>
              <p className="text-xs text-text-tertiary border-t pt-3">
                A régua é processada pelo cron diariamente em <code>/api/cron/billing</code>. Toda mudança vale para faturas a partir do próximo ciclo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrações ativas</CardTitle>
              <CardDescription>
                Estas integrações são configuradas via variáveis de ambiente na Vercel. Aqui você vê o status atual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {status && (
                <>
                  <IntegrationStatus
                    name="Asaas (gateway de pagamento)"
                    ok={status.asaas.configured}
                    extra={status.asaas.configured ? `Ambiente: ${status.asaas.env ?? 'desconhecido'}${status.asaas.webhook_configured ? ' · webhook OK' : ' · webhook ausente'}` : 'Defina ASAAS_API_KEY na Vercel'}
                  />
                  <IntegrationStatus
                    name="Resend (envio de email)"
                    ok={status.resend.configured}
                    extra={status.resend.configured ? `Remetente: ${status.resend.from ?? '—'}` : 'Defina RESEND_API_KEY na Vercel'}
                  />
                  <IntegrationStatus
                    name="Twilio WhatsApp (2FA + notificações)"
                    ok={status.twilio_whatsapp.configured}
                    extra={status.twilio_whatsapp.configured ? `Número: ${status.twilio_whatsapp.from ?? '—'}` : 'Defina TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN'}
                  />
                  <IntegrationStatus
                    name="Cron (cobrança automática, alertas)"
                    ok={status.cron.configured}
                    extra={status.cron.configured ? 'CRON_SECRET configurado' : 'Defina CRON_SECRET'}
                  />
                  <IntegrationStatus
                    name="Supabase"
                    ok={status.supabase.configured}
                    extra={status.supabase.configured ? status.supabase.url : 'Defina NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-info/30 bg-info-soft/30">
            <CardHeader>
              <CardTitle className="text-base">Roadmap de integrações</CardTitle>
              <CardDescription>O que está em estudo para próximas releases. Sem data confirmada.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-text-tertiary">•</span>
                  <div>
                    <strong>VM PAY (API direta)</strong> — substituir upload manual de planilha por pull automático D-0.
                    Depende da API do VM PAY disponibilizar acesso.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-text-tertiary">•</span>
                  <div>
                    <strong>VendPago (API direta)</strong> — em avaliação; sem endpoint público anunciado até o momento.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-text-tertiary">•</span>
                  <div>
                    <strong>Conectvip / outros sistemas de telemetria</strong> — possível via parser CSV se exportarem.
                  </div>
                </li>
              </ul>
              <p className="text-xs text-text-tertiary mt-3 border-t pt-3">
                Não comunicar essas integrações aos clientes até existir contrato/teste real.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : <><Save className="mr-2 h-4 w-4" />Salvar configurações</>}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type ?? 'text'} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function NumField({ label, hint, value, onChange, min, max }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
      {hint && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

function IntegrationStatus({ name, ok, extra }: { name: string; ok: boolean; extra?: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {ok ? (
            <Badge className="bg-success-soft text-success text-xs">Configurado</Badge>
          ) : (
            <Badge className="bg-danger-soft text-danger text-xs">Não configurado</Badge>
          )}
        </div>
        {extra && <p className="text-xs text-text-tertiary mt-0.5">{extra}</p>}
      </div>
      <a
        href="https://vercel.com/dashboard"
        target="_blank"
        rel="noopener"
        className="text-xs text-brand-navy hover:underline flex items-center gap-1 shrink-0 mt-1"
      >
        Vercel <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
