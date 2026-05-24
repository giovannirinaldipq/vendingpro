'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  email: z.string().email('Email inválido'),
});
type Input = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Input>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Input) {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) {
        // Não revelamos se o email existe — sempre dizemos que enviamos
        console.error(error);
      }
      setSent(true);
    } catch {
      toast.error('Erro ao enviar. Tente novamente.');
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
            <CardTitle className="text-2xl">Esqueceu a senha?</CardTitle>
            <CardDescription>
              {sent
                ? 'Se este email estiver cadastrado, você receberá em instantes um link para redefinir sua senha.'
                : 'Informe seu email e enviaremos um link para você criar uma nova senha.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <Link href="/login" className="inline-flex items-center text-sm text-brand-primary hover:underline font-medium">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para o login
              </Link>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" autoComplete="email" {...register('email')} disabled={isLoading} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold h-11" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>) : 'Enviar link de redefinição'}
                </Button>
                <div className="text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-brand-primary">
                    Lembrei minha senha
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
