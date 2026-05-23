'use client';

import { useEffect, useState } from 'react';
import { Loader2, Shield, ShieldCheck, Trash2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

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

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.all ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
            {has2FA ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <Shield className="h-5 w-5" />}
            Autenticação de dois fatores (2FA)
            {has2FA && <Badge className="bg-green-100 text-green-700">Ativo</Badge>}
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
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{f.friendly_name ?? 'TOTP'}</p>
                    <p className="text-xs text-muted-foreground">Ativo · {f.factor_type}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => unenroll(f.id)} className="text-red-600">
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
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <div>
                    <p className="font-medium mb-2">1. Escaneie este QR no seu app autenticador:</p>
                    <div className="bg-white p-3 rounded inline-block" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  </div>
                  {secret && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Ou cole o código manualmente:</p>
                      <code className="text-xs bg-white p-2 rounded border block font-mono break-all">{secret}</code>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="code">2. Digite o código de 6 dígitos gerado pelo app:</Label>
                    <Input id="code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="font-mono text-center text-2xl" maxLength={6} />
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
    </div>
  );
}
