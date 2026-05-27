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
    <div className="vp-conveyor-bg min-h-[100svh] relative flex flex-col items-center justify-center overflow-hidden px-6 py-8">

      {/* Partículas ambientes — 6 pontinhos drift */}
      <div className="vp-particle" style={{ left: '12%', top: '55%', width: 3, height: 3, background: '#fbbf24', animation: 'vp-drift-a 12s ease-out infinite' }} />
      <div className="vp-particle" style={{ left: '6%', top: '70%', width: 2, height: 2, background: 'rgba(255,255,255,0.7)', animation: 'vp-drift-b 14s ease-out -4s infinite' }} />
      <div className="vp-particle" style={{ left: '20%', top: '65%', width: 2, height: 2, background: '#fbbf24', animation: 'vp-drift-c 16s ease-out -8s infinite' }} />
      <div className="vp-particle" style={{ left: '80%', top: '60%', width: 3, height: 3, background: '#fbbf24', animation: 'vp-drift-a 13s ease-out -2s infinite' }} />
      <div className="vp-particle" style={{ left: '92%', top: '72%', width: 2, height: 2, background: 'rgba(255,255,255,0.6)', animation: 'vp-drift-b 15s ease-out -6s infinite' }} />
      <div className="vp-particle" style={{ left: '86%', top: '50%', width: 2, height: 2, background: '#fbbf24', animation: 'vp-drift-c 18s ease-out -10s infinite' }} />

      {/* Coluna de conteúdo */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* PERSONAGEM MÁQUINA */}
        <svg
          width="160" height="224"
          viewBox="0 0 200 280"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6"
          aria-hidden="true"
        >
          <g className="vp-breathe">
            <g className="vp-machine-cycle">
              <rect x="20" y="30" width="160" height="240" rx="14" fill="rgba(20,38,89,0.4)" stroke="#fff" strokeWidth="2" strokeOpacity="0.72"/>
              <rect x="38" y="50" width="124" height="40" rx="6" fill="rgba(0,0,0,0.2)" stroke="#fff" strokeWidth="1.2" strokeOpacity="0.45"/>
              <g className="vp-blink">
                <circle cx="82" cy="70" r="4.5" fill="#fbbf24"/>
                <circle cx="118" cy="70" r="4.5" fill="#fbbf24"/>
              </g>
              <rect x="48" y="108" width="32" height="32" rx="3" fill="#fbbf24"/>
              <rect x="84" y="108" width="32" height="32" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.45"/>
              <rect x="120" y="108" width="32" height="32" rx="3" fill="#fbbf24"/>
              <rect x="48" y="144" width="32" height="32" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.45"/>
              <rect x="84" y="144" width="32" height="32" rx="3" fill="#fbbf24"/>
              <rect x="120" y="144" width="32" height="32" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.45"/>
              <rect x="48" y="180" width="32" height="32" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.45"/>
              <rect x="84" y="180" width="32" height="32" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.45"/>
              <rect x="120" y="180" width="32" height="32" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.45"/>
              <rect x="36" y="225" width="128" height="32" rx="4" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.5"/>
              <line x1="44" y1="244" x2="156" y2="244" stroke="#fff" strokeOpacity="0.25" strokeWidth="0.8"/>
            </g>
          </g>
        </svg>

        {/* Wordmark */}
        <div
          className="mb-11 leading-none text-[26px] sm:text-[32px]"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            letterSpacing: '-0.015em',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.92)' }}>Vending</span>
          <span style={{ color: '#fbbf24', marginLeft: 8 }}>Pro</span>
        </div>

        {/* Título */}
        <h1
          className="text-white text-xl font-medium mb-7 self-start"
          style={{ letterSpacing: '-0.01em' }}
        >
          Acesse sua conta
        </h1>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full">
          <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Email
          </label>
          <input
            {...emailRest}
            ref={(el) => { emailHookRef(el); emailRef.current = el; }}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            disabled={isLoading}
            className="vp-input w-full px-3.5 py-2.5 mb-1 text-sm text-white rounded-lg outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          {errors.email && (
            <p className="mb-3 text-xs" style={{ color: '#fca5a5' }}>{errors.email.message}</p>
          )}
          {!errors.email && <div className="mb-4" />}

          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Senha
            </label>
            <Link
              href="/forgot-password"
              className="text-xs no-underline hover:underline"
              style={{ color: '#fbbf24' }}
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
            className="vp-input w-full px-3.5 py-2.5 mb-1 text-sm text-white rounded-lg outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          {errors.password && (
            <p className="mb-4 text-xs" style={{ color: '#fca5a5' }}>{errors.password.message}</p>
          )}
          {!errors.password && <div className="mb-5" />}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: '#fbbf24', color: '#1e3a8a' }}
            onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#f59e0b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fbbf24'; }}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>
            ) : (
              <><span>Entrar</span><ArrowRight size={16} /></>
            )}
          </button>

          <p className="mt-5 text-center text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Primeira vez?{' '}
            <a
              href="mailto:contato@vendingpro.com.br?subject=Solicitar%20acesso%20VendingPro"
              className="no-underline hover:underline"
              style={{ color: '#fbbf24' }}
            >
              Solicitar acesso
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
