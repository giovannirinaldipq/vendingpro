'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { loginSchema, type LoginInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/client';
import { NetworkVisual } from '@/components/login/NetworkVisual';
import { LiveIndicator } from '@/components/login/LiveIndicator';

/**
 * Login v3 — split-screen 55/45.
 * Esquerda: painel storytelling (#0a1233, navy profundo) com logo, headline,
 *           network visual SVG e live indicator pulsante.
 * Direita: form premium em #18181b (neutral dark) com inputs focus amber
 *          e CTA amber→navy.
 *
 * Mobile (<768px): colapsa para top hero de 240px (só logo + headline +
 * live indicator, sem network visual) e form abaixo.
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // Autofocus no email ao montar
  useEffect(() => { emailRef.current?.focus(); }, []);

  const { ref: emailHookRef, ...emailRest } = register('email');

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

      const whoami = await fetch('/api/whoami').then(r => r.json());
      toast.success('Login realizado');
      router.push(whoami.redirect_to ?? '/app');
      router.refresh();
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100svh] w-full flex-col md:flex-row" style={{ background: '#18181b' }}>
      {/* ───────── PAINEL ESQUERDO ─ Storytelling ───────── */}
      <aside
        className="relative flex flex-col px-6 py-8 md:w-[55%] md:px-12 md:py-12 lg:px-16"
        style={{ background: '#0a1233' }}
      >
        {/* Pattern grid sutil — SVG inline com <pattern> */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="login-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.06" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>

        {/* Conteúdo — distribuído em 3 zonas verticais */}
        <div className="relative z-10 flex flex-1 flex-col">
          {/* ZONA 1 — Logo (topo) */}
          <div>
            <img
              src="/brand/10-vending-pro-horizontal-darkmode.svg"
              alt="Vending Pro"
              style={{ height: 32, width: 'auto' }}
            />
          </div>

          {/* ZONA 2 — Headline + network visual (centro) */}
          <div className="flex flex-1 flex-col justify-center pt-8 pb-6 md:py-12">
            <h2
              className="font-sans text-2xl text-white md:text-[28px]"
              style={{ fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.2 }}
            >
              Sua rede em tempo real.
            </h2>
            <p
              className="mt-2 max-w-[28ch] text-sm"
              style={{ color: '#94a3b8', lineHeight: 1.5, marginBottom: 32 }}
            >
              Cada máquina, cada transação, em um único lugar.
            </p>

            {/* Network visual — escondido em mobile pra economizar altura */}
            <div className="hidden md:block">
              <NetworkVisual />
            </div>
          </div>

          {/* ZONA 3 — Live indicator (rodapé) */}
          <div>
            <LiveIndicator />
          </div>
        </div>
      </aside>

      {/* ───────── PAINEL DIREITO ─ Formulário ───────── */}
      <main
        className="flex flex-1 items-center justify-center px-6 py-10 md:w-[45%] md:px-16"
        style={{ background: '#18181b' }}
      >
        <div className="w-full max-w-[360px]">
          <h1
            className="font-sans text-[22px] text-white"
            style={{ fontWeight: 500 }}
          >
            Acesse sua conta
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#94a3b8', marginBottom: 32 }}>
            Bem-vindo de volta
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[13px]"
                style={{ fontWeight: 500, color: '#94a3b8' }}
              >
                Email
              </label>
              <input
                {...emailRest}
                ref={(el) => {
                  emailHookRef(el);
                  emailRef.current = el;
                }}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                disabled={isLoading}
                className="w-full rounded-md border text-sm text-white placeholder:text-[#71717a] transition-shadow focus:outline-none"
                style={{
                  background: '#27272a',
                  borderColor: '#3f3f46',
                  padding: '11px 14px',
                  fontSize: 14,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#fbbf24';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3f3f46';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div style={{ marginBottom: 24 }}>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="text-[13px]"
                  style={{ fontWeight: 500, color: '#94a3b8' }}
                >
                  Senha
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[13px] transition-colors hover:underline"
                  style={{ color: '#fbbf24', textUnderlineOffset: 4 }}
                >
                  Esqueci a senha
                </Link>
              </div>
              <input
                {...register('password')}
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full rounded-md border text-sm text-white placeholder:text-[#71717a] transition-shadow focus:outline-none"
                style={{
                  background: '#27272a',
                  borderColor: '#3f3f46',
                  padding: '11px 14px',
                  fontSize: 14,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#fbbf24';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3f3f46';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Botão "Entrar" — amber bg, navy text */}
            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-md text-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: '#fbbf24',
                color: '#1e3a8a',
                fontWeight: 500,
                padding: '12px 16px',
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                if (isLoading) return;
                e.currentTarget.style.background = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fbbf24';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé — Primeira vez? */}
          <p
            className="mt-7 text-center text-[13px]"
            style={{ color: '#94a3b8' }}
          >
            Primeira vez?{' '}
            <Link
              href="/register"
              className="transition-colors hover:underline"
              style={{ color: '#fbbf24', textUnderlineOffset: 4 }}
            >
              Solicitar acesso
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
