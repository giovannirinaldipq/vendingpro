'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'As senhas não conferem',
  path: ['confirm'],
});
type Input = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase parseia o token do hash automaticamente e dispara PASSWORD_RECOVERY
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Confere se já tem sessão de recovery (caso o evento já tenha disparado antes)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setTimeout(() => {
        if (!ready) setTokenError('Link inválido ou expirado. Solicite um novo email.');
      }, 1500);
    });
    return () => { sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Input) {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        toast.error(error.message || 'Erro ao redefinir senha');
        return;
      }
      toast.success('Senha redefinida! Faça login com a nova senha.');
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-70" />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo variant="horizontal" forceTheme="light" height={44} priority />
        </div>
        <Card className="shadow-card border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Definir nova senha</CardTitle>
            <CardDescription>
              Escolha uma senha de no mínimo 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokenError ? (
              <div className="space-y-4">
                <p className="text-sm text-destructive">{tokenError}</p>
                <Link href="/forgot-password" className="text-sm text-brand-primary hover:underline font-medium">
                  Solicitar novo link
                </Link>
              </div>
            ) : !ready ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input id="password" type="password" placeholder="••••••••" autoComplete="new-password" {...register('password')} disabled={isLoading} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input id="confirm" type="password" placeholder="••••••••" autoComplete="new-password" {...register('confirm')} disabled={isLoading} />
                  {errors.confirm && <p className="text-sm text-destructive">{errors.confirm.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold h-11" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : 'Redefinir senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
