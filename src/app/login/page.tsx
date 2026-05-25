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

/**
 * Login v4 — single-column centered.
 *
 * Direção: "minimalist cartoon premium". Fundo navy da marca #142659,
 * pattern grid sutil, ilustração cartoon de uma máquina de vending como
 * herói visual (os slots amber replicam o padrão da logo: cantos do topo +
 * centro). Sem split-screen, sem stats falsas, sem cards escuros.
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
    <div
      className="relative flex min-h-[100svh] flex-col items-center justify-center px-5"
      style={{ background: '#142659' }}
    >
      {/* Pattern grid sutil — branco 0.5px / opacity 0.04, células 32x32 */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 0 }}
      >
        <defs>
          <pattern id="login-bg-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.04" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-bg-grid)" />
      </svg>

      {/* Conteúdo */}
      <div
        className="relative flex w-full max-w-[360px] flex-col items-center"
        style={{ zIndex: 1 }}
      >
        {/* 1. ILUSTRAÇÃO da máquina — herói visual */}
        <svg
          width="98"
          height="148"
          viewBox="0 0 120 180"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="mb-[18px] sm:w-[98px] sm:h-[148px]"
          style={{ width: 80, height: 120 }}
        >
          <rect x="10" y="10" width="100" height="160" rx="10"
                fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.7"/>
          <rect x="20" y="22" width="80" height="14" rx="2.5"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.35"/>
          <circle cx="28" cy="29" r="1.2" fill="#fbbf24"/>
          <line x1="34" y1="29" x2="56" y2="29"
                stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8"/>
          {/* row 1 */}
          <rect x="26" y="48" width="20" height="22" rx="2" fill="#fbbf24"/>
          <rect x="50" y="48" width="20" height="22" rx="2"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4"/>
          <rect x="74" y="48" width="20" height="22" rx="2" fill="#fbbf24"/>
          {/* row 2 */}
          <rect x="26" y="74" width="20" height="22" rx="2"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4"/>
          <rect x="50" y="74" width="20" height="22" rx="2" fill="#fbbf24"/>
          <rect x="74" y="74" width="20" height="22" rx="2"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4"/>
          {/* row 3 */}
          <rect x="26" y="100" width="20" height="22" rx="2"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4"/>
          <rect x="50" y="100" width="20" height="22" rx="2"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4"/>
          <rect x="74" y="100" width="20" height="22" rx="2"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.4"/>
          {/* slot inferior */}
          <rect x="20" y="138" width="80" height="20" rx="3"
                fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.35"/>
          <line x1="24" y1="150" x2="96" y2="150"
                stroke="#fff" strokeOpacity="0.2" strokeWidth="0.5"/>
        </svg>

        {/* 2. WORDMARK "Vending Pro" — tipografia nítida (não SVG) */}
        <div
          className="text-[26px] sm:text-[32px]"
          style={{
            marginBottom: 44,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.92)' }}>Vending</span>
          <span style={{ color: '#fbbf24', marginLeft: 8 }}>Pro</span>
        </div>

        {/* 3. TÍTULO */}
        <h1
          className="text-[18px] sm:text-[20px]"
          style={{
            color: '#fff',
            fontWeight: 500,
            margin: '0 0 28px',
            letterSpacing: '-0.01em',
            alignSelf: 'flex-start',
          }}
        >
          Acesse sua conta
        </h1>

        {/* 4-6. FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full">
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block"
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                fontWeight: 500,
                marginBottom: 7,
              }}
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
              className="w-full focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '11px 14px',
                fontSize: 14,
                color: '#fff',
                transition: 'all 150ms',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#fbbf24';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs" style={{ color: '#fca5a5' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 22 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 7 }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                  fontWeight: 500,
                }}
              >
                Senha
              </label>
              <Link
                href="/forgot-password"
                className="hover:underline"
                style={{
                  fontSize: 12,
                  color: '#fbbf24',
                  textDecoration: 'none',
                  textUnderlineOffset: 3,
                }}
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
              className="w-full focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '11px 14px',
                fontSize: 14,
                color: '#fff',
                transition: 'all 150ms',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#fbbf24';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {errors.password && (
              <p className="mt-1.5 text-xs" style={{ color: '#fca5a5' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: '#fbbf24',
              color: '#1e3a8a',
              border: 'none',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              gap: 7,
              cursor: 'pointer',
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
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
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid rgba(251,191,36,0.5)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* 7. Link secundário */}
        <p
          style={{
            margin: '24px 0 0',
            textAlign: 'center',
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Primeira vez?{' '}
          <Link
            href="/request-access"
            className="hover:underline"
            style={{ color: '#fbbf24', textDecoration: 'none', textUnderlineOffset: 3 }}
          >
            Solicitar acesso
          </Link>
        </p>
      </div>
    </div>
  );
}
