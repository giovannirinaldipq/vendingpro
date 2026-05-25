'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MessageCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function TwoFaChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';

  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendCode() {
    setSending(true);
    try {
      const res = await fetch('/api/auth/2fa/login/send', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSent(true);
        setPhoneHint(json.data.phone_hint ?? null);
        if (json.data.skipped) {
          toast.warning('WhatsApp não configurado — código no log do servidor (dev)', { duration: 6000 });
        } else if (json.data.sent) {
          toast.success('Código enviado pelo WhatsApp');
        }
      } else {
        toast.error(json.error?.message ?? 'Falha ao enviar código');
      }
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/2fa/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Verificado');
        router.push(redirect);
        router.refresh();
      } else {
        toast.error(json.error?.message ?? 'Código inválido');
      }
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => { sendCode(); }, []);

  return (
    <div
      className="min-h-[100svh] flex items-center justify-center px-4"
      style={{ background: '#142659' }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" />
            Verificação de 2 fatores
          </CardTitle>
          <CardDescription>
            {phoneHint
              ? <>Digite o código de 6 dígitos que enviamos pelo WhatsApp para <span className="font-mono">{phoneHint}</span>.</>
              : 'Digite o código que enviamos pelo seu WhatsApp.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-code">Código de verificação</Label>
            <Input
              id="otp-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              className="font-mono text-center text-2xl tabular-nums"
            />
          </div>
          <Button onClick={verify} disabled={verifying || code.length !== 6} className="w-full">
            {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando…</> : <>Confirmar<ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Código válido por 10 minutos · 5 tentativas</span>
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="text-brand-navy hover:underline disabled:opacity-50"
            >
              {sending ? 'Enviando…' : (sent ? 'Reenviar' : 'Enviar')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TwoFaChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-text-tertiary" /></div>}>
      <TwoFaChallengeContent />
    </Suspense>
  );
}
