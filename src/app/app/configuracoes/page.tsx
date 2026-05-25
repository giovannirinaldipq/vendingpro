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
import { Pill } from '@/components/ui/pill';
import { User, Building2, Bell, Shield, Loader2, Save, CreditCard, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface VoucherFee { label: string; percent: number; }

interface FinanceSettings {
  tenant_id: string;
  card_fee_percent: number;
  debit_card_fee_percent: number;
  pix_fee_percent: number;
  cash_fee_percent: number;
  meal_voucher_fee_percent: number;
  other_voucher_fees: VoucherFee[];
}

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

  const [finance, setFinance] = useState<FinanceSettings | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeSaving, setFinanceSaving] = useState(false);

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

    fetch('/api/app/finance-settings')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setFinance({
            ...json.data,
            other_voucher_fees: Array.isArray(json.data.other_voucher_fees)
              ? json.data.other_voucher_fees
              : [],
          });
        }
      })
      .finally(() => setFinanceLoading(false));
  }, []);

  function updateFinance<K extends keyof FinanceSettings>(key: K, value: FinanceSettings[K]) {
    setFinance(f => f ? { ...f, [key]: value } : f);
  }

  function addVoucher() {
    setFinance(f => f ? {
      ...f,
      other_voucher_fees: [...f.other_voucher_fees, { label: '', percent: 0 }],
    } : f);
  }

  function updateVoucher(idx: number, patch: Partial<VoucherFee>) {
    setFinance(f => f ? {
      ...f,
      other_voucher_fees: f.other_voucher_fees.map((v, i) => i === idx ? { ...v, ...patch } : v),
    } : f);
  }

  function removeVoucher(idx: number) {
    setFinance(f => f ? {
      ...f,
      other_voucher_fees: f.other_voucher_fees.filter((_, i) => i !== idx),
    } : f);
  }

  async function saveFinance() {
    if (!finance) return;
    setFinanceSaving(true);
    try {
      const validVouchers = finance.other_voucher_fees.filter(v => v.label.trim() && v.percent >= 0);
      const body = {
        card_fee_percent: finance.card_fee_percent,
        debit_card_fee_percent: finance.debit_card_fee_percent,
        pix_fee_percent: finance.pix_fee_percent,
        cash_fee_percent: finance.cash_fee_percent,
        meal_voucher_fee_percent: finance.meal_voucher_fee_percent,
        other_voucher_fees: validVouchers,
      };
      const res = await fetch('/api/app/finance-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Taxas financeiras salvas');
        setFinance({
          ...json.data,
          other_voucher_fees: Array.isArray(json.data.other_voucher_fees) ? json.data.other_voucher_fees : [],
        });
      } else {
        toast.error(json.error ?? 'Falha ao salvar');
      }
    } finally {
      setFinanceSaving(false);
    }
  }

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

      {/* Taxas financeiras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Taxas dos meios de pagamento
          </CardTitle>
          <CardDescription>
            Configure quanto cada operadora desconta da sua receita. Usado nos relatórios
            de margem real e nos alertas de prejuízo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {financeLoading || !finance ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FeeField
                  label="Cartão de Crédito"
                  value={finance.card_fee_percent}
                  onChange={v => updateFinance('card_fee_percent', v)}
                  max={30}
                  hint="Bandeiras de crédito (Visa, Master, Elo)"
                />
                <FeeField
                  label="Cartão de Débito"
                  value={finance.debit_card_fee_percent}
                  onChange={v => updateFinance('debit_card_fee_percent', v)}
                  max={30}
                  hint="Geralmente menor que crédito"
                />
                <FeeField
                  label="PIX"
                  value={finance.pix_fee_percent}
                  onChange={v => updateFinance('pix_fee_percent', v)}
                  max={10}
                  hint="Normalmente 0% no QR Code direto"
                />
                <FeeField
                  label="Dinheiro"
                  value={finance.cash_fee_percent}
                  onChange={v => updateFinance('cash_fee_percent', v)}
                  max={10}
                  hint="Custo operacional de coleta/troco"
                />
                <FeeField
                  label="Vale Alimentação/Refeição"
                  value={finance.meal_voucher_fee_percent}
                  onChange={v => updateFinance('meal_voucher_fee_percent', v)}
                  max={30}
                  hint="Alelo, Sodexo, VR, Ticket"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">Outros vouchers</p>
                    <p className="text-xs text-text-tertiary">
                      Adicione outros meios de pagamento com taxas próprias (Caju, Flash, Swile, etc)
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addVoucher}>
                    <Plus className="mr-1 h-4 w-4" />Adicionar
                  </Button>
                </div>

                {finance.other_voucher_fees.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-tertiary">
                    Nenhum voucher adicional cadastrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {finance.other_voucher_fees.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Nome do voucher (ex: Caju)"
                          value={v.label}
                          onChange={e => updateVoucher(idx, { label: e.target.value })}
                          className="flex-1"
                        />
                        <div className="relative w-32">
                          <Input
                            type="number"
                            min={0}
                            max={30}
                            step={0.1}
                            inputMode="decimal"
                            value={v.percent}
                            onChange={e => updateVoucher(idx, { percent: Number(e.target.value) })}
                            className="pr-8 tabular-nums"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">%</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeVoucher(idx)}
                          aria-label={`Remover ${v.label || 'voucher'}`}
                        >
                          <Trash2 className="h-4 w-4 text-text-tertiary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={saveFinance} disabled={financeSaving}>
                {financeSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar taxas</>}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

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
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2">
                Autenticação em 2 fatores (WhatsApp)
                <Pill tone="amber" size="sm">Em breve</Pill>
              </p>
              <p className="text-sm text-muted-foreground">Receba um código no WhatsApp ao fazer login</p>
            </div>
            <Button variant="outline" size="sm" disabled>Ativar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeeField({
  label, value, onChange, max, hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-text-secondary">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          max={max}
          step={0.1}
          inputMode="decimal"
          value={value ?? 0}
          onChange={e => onChange(Number(e.target.value))}
          className="pr-8 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">%</span>
      </div>
      {hint && <p className="text-[11px] text-text-tertiary">{hint}</p>}
    </div>
  );
}
