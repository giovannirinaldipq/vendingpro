'use client';

import { useEffect, useState } from 'react';
import { Loader2, Shield, ShieldCheck, Trash2, KeyRound, MessageCircle, Phone, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill } from '@/components/ui/pill';
import { createClient } from '@/lib/supabase/client';

interface WhatsApp2FA {
  phone: string;
  is_verified: boolean;
  verified_at: string | null;
}

interface Factor {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
}

export default function SecurityPage() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // WhatsApp 2FA
  const [wa2fa, setWa2fa] = useState<WhatsApp2FA | null>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [waPhone, setWaPhone] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waCode, setWaCode] = useState('');
  const [waConfirming, setWaConfirming] = useState(false);
  const [waOtpPending, setWaOtpPending] = useState(false);

  async function loadWa() {
    setWaLoading(true);
    try {
      const r = await fetch('/api/auth/2fa/whatsapp');
      const j = await r.json();
      if (j.success) {
        setWa2fa(j.data);
        if (j.data?.phone) setWaPhone(j.data.phone);
      }
    } finally {
      setWaLoading(false);
    }
  }

  async function startWaSetup() {
    if (!waPhone.trim()) {
      toast.error('Digite seu número de WhatsApp');
      return;
    }
    setWaSending(true);
    try {
      const r = await fetch('/api/auth/2fa/whatsapp/start-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhone }),
      });
      const j = await r.json();
      if (j.success) {
        if (j.data.sent) {
          toast.success(j.data.message);
        } else if (j.data.skipped) {
          toast.warning(j.data.message, { duration: 6000 });
          if (j.data.dev_code) {
            // eslint-disable-next-line no-console
            console.info('[2FA-WA dev] Código:', j.data.dev_code);
          }
        } else {
          toast.error(j.data.message);
        }
        setWaOtpPending(true);
        setWaCode('');
        loadWa();
      } else {
        toast.error(j.error?.message ?? 'Falha');
      }
    } finally {
      setWaSending(false);
    }
  }

  async function confirmWaSetup() {
    if (waCode.length !== 6) return;
    setWaConfirming(true);
    try {
      const r = await fetch('/api/auth/2fa/whatsapp/confirm-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: waCode }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success('WhatsApp 2FA ativado');
        setWaOtpPending(false);
        setWaCode('');
        loadWa();
      } else {
        toast.error(j.error?.message ?? 'Código inválido');
      }
    } finally {
      setWaConfirming(false);
    }
  }

  async function disableWa() {
    if (!confirm('Desativar 2FA via WhatsApp?')) return;
    const r = await fetch('/api/auth/2fa/whatsapp', { method: 'DELETE' });
    const j = await r.json();
    if (j.success) {
      toast.success('Desativado');
      setWa2fa(null);
      setWaPhone('');
      setWaOtpPending(false);
    } else {
      toast.error('Falha');
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.all ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); loadWa(); }, []);

  async function enroll() {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'TOTP App' });
      if (error || !data) {
        toast.error(error?.message ?? 'Falha ao iniciar 2FA');
        return;
      }
      setFactorId(data.id);
      setQrSvg(data.totp.qr_code);
      setSecret(data.totp.secret);
    } finally {
      setEnrolling(false);
    }
  }

  async function verify() {
    if (!factorId || !code) return;
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
      if (cErr || !challenge) {
        toast.error(cErr?.message ?? 'Falha ao gerar challenge');
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        toast.error('Código inválido');
        return;
      }
      toast.success('2FA ativado!');
      setQrSvg(null);
      setSecret(null);
      setFactorId(null);
      setCode('');
      load();
    } finally {
      setVerifying(false);
    }
  }

  async function unenroll(id: string) {
    if (!confirm('Desativar 2FA? Sua conta voltará a usar apenas senha.')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) toast.error(error.message);
    else { toast.success('2FA desativado'); load(); }
  }

  const verifiedFactors = factors.filter(f => f.status === 'verified');
  const has2FA = verifiedFactors.length > 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Segurança</h1>
        <p className="text-sm text-muted-foreground">Proteja sua conta com autenticação de dois fatores.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {has2FA ? <ShieldCheck className="h-5 w-5 text-success" /> : <Shield className="h-5 w-5" />}
            App autenticador (TOTP)
            {has2FA && <Pill tone="success" size="sm" dot>Ativo</Pill>}
          </CardTitle>
          <CardDescription>
            Use um app autenticador (Google Authenticator, Authy, 1Password) para gerar códigos de 6 dígitos a cada login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {verifiedFactors.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 border border-border-default rounded-lg">
                  <div>
                    <p className="font-medium">{f.friendly_name ?? 'TOTP'}</p>
                    <p className="text-xs text-text-tertiary">Ativo · {f.factor_type}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => unenroll(f.id)} className="text-danger">
                    <Trash2 className="mr-1 h-4 w-4" />Remover
                  </Button>
                </div>
              ))}

              {!qrSvg && !has2FA && (
                <Button onClick={enroll} disabled={enrolling}>
                  {enrolling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando QR...</> : <><KeyRound className="mr-2 h-4 w-4" />Ativar 2FA</>}
                </Button>
              )}

              {qrSvg && (
                <div className="space-y-4 border border-border-default rounded-lg p-4 bg-surface-subtle/40">
                  <div>
                    <p className="font-medium mb-2">1. Escaneie este QR no seu app autenticador:</p>
                    <div className="bg-white p-3 rounded inline-block" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  </div>
                  {secret && (
                    <div>
                      <p className="text-sm text-text-tertiary mb-1">Ou cole o código manualmente:</p>
                      <code className="text-xs bg-surface-card p-2 rounded border border-border-default block font-mono break-all">{secret}</code>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="code">2. Digite o código de 6 dígitos gerado pelo app:</Label>
                    <Input id="code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="font-mono text-center text-2xl tabular-nums" maxLength={6} />
                  </div>
                  <Button onClick={verify} disabled={verifying || code.length !== 6} className="w-full">
                    {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando</> : 'Confirmar e ativar'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" />
            2FA via WhatsApp
            {wa2fa?.is_verified && <Pill tone="success" size="sm" dot>Ativo</Pill>}
            {!wa2fa?.is_verified && wa2fa && <Pill tone="warning" size="sm">Pendente</Pill>}
          </CardTitle>
          <CardDescription>
            Receba um código no WhatsApp ao fazer login. Backup mais simples que o app autenticador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {waLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-text-tertiary" /></div>
          ) : wa2fa?.is_verified ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-success/30 bg-success-soft/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-text-primary">Telefone verificado</p>
                    <p className="text-xs text-text-tertiary tabular-nums font-mono">{wa2fa.phone}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={disableWa} className="text-danger">
                  <Trash2 className="mr-1 h-4 w-4" />Remover
                </Button>
              </div>
              <p className="text-xs text-text-tertiary">
                Você receberá um código de 6 dígitos por WhatsApp a cada login. (Ativação no fluxo de login chega no próximo update.)
              </p>
            </div>
          ) : waOtpPending ? (
            <div className="space-y-4 border border-border-default rounded-lg p-4 bg-surface-subtle/40">
              <p className="text-sm text-text-secondary">
                Enviamos um código de 6 dígitos para <span className="font-medium tabular-nums">{waPhone}</span>.
                Digite abaixo para confirmar o número.
              </p>
              <div className="space-y-2">
                <Label htmlFor="wa-code">Código do WhatsApp</Label>
                <Input
                  id="wa-code"
                  value={waCode}
                  onChange={e => setWaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-2xl tabular-nums"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmWaSetup} disabled={waConfirming || waCode.length !== 6} className="flex-1">
                  {waConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando</> : 'Confirmar'}
                </Button>
                <Button variant="outline" onClick={startWaSetup} disabled={waSending}>
                  {waSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reenviar'}
                </Button>
              </div>
              <p className="text-[11px] text-text-tertiary">Código válido por 10 minutos. Máx. 5 tentativas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="wa-phone">Número do WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    id="wa-phone"
                    placeholder="+55 11 98765-4321"
                    value={waPhone}
                    onChange={e => setWaPhone(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
                <p className="text-[11px] text-text-tertiary">
                  Inclua o código do país (+55 para Brasil). Aceitamos formato com ou sem espaços/traços.
                </p>
              </div>
              <Button onClick={startWaSetup} disabled={waSending || !waPhone.trim()}>
                {waSending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando código...</>
                  : <><MessageCircle className="mr-2 h-4 w-4" />Enviar código de verificação</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
