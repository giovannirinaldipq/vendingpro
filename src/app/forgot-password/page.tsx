'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Esqueceu a senha?</CardTitle>
          <CardDescription>
            {sent
              ? 'Se este email estiver cadastrado, você receberá em instantes um link para redefinir sua senha.'
              : 'Informe seu email e enviaremos um link para você criar uma nova senha.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Link href="/login" className="inline-flex items-center text-sm text-primary hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para o login
            </Link>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} disabled={isLoading} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>) : 'Enviar link de redefinição'}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                  Lembrei minha senha
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
