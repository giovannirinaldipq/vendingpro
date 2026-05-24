'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error('Credenciais inválidas');
        return;
      }

      toast.success('Login realizado');
      router.push('/app');
      router.refresh();
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* Pattern grid sutil — Linear-style */}
      <div className="pointer-events-none absolute inset-0 bg-grid-subtle" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[400px]">
          {/* Logo stacked dark */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/brand/01-vending-pro-stacked-dark.svg"
              alt="Vending Pro"
              width={240}
              height={175}
              priority
            />
          </div>

          <Card>
            <CardContent className="p-7">
              <div className="mb-6">
                <h1 className="text-lg font-semibold tracking-tight text-text-primary">
                  Acesse sua conta
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Entre com email e senha
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-text-secondary">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    {...register('email')}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <p className="text-xs text-danger">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-text-secondary">
                      Senha
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-brand-navy hover:underline"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <p className="text-xs text-danger">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-text-tertiary">
            © 2026 Vending Pro · Gestão para vending machines
          </p>
        </div>
      </div>
    </div>
  );
}
