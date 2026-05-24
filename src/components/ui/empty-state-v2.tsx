'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EmptyState v2 — estilo "Minimalist Cartoon Premium".
 *
 * Cada ilustração é SVG inline 120x120 com stroke 1.5px (linhas finas)
 * + UMA forma sólida amber pra criar foco e personalidade.
 *
 * NÃO é um ícone Lucide ampliado — é uma ilustração contextual.
 *
 * Catálogo:
 *  - 'no-alerts':   relógio com check amber dentro (tudo respirando bem)
 *  - 'no-machines': grade 3x3 com 1 célula amber (CTA: cadastrar)
 *  - 'no-sales':    carrinho minimalista com ponto amber (CTA: importar)
 *  - 'no-results':  lupa com ponto amber (busca sem resultado)
 *  - 'no-data':     gráfico com linha amber subindo (CTA: importar)
 */

type Illustration = 'no-alerts' | 'no-machines' | 'no-sales' | 'no-results' | 'no-data';

interface EmptyStateV2Props {
  illustration: Illustration;
  title: string;
  description?: string;
  /** Texto do CTA. Se omitido, não mostra. */
  ctaLabel?: string;
  /** Link interno do CTA */
  ctaHref?: string;
  /** Callback do CTA quando não é link */
  onCtaClick?: () => void;
  /** Mensagem positiva — usa tom amber mais celebratório */
  positive?: boolean;
  className?: string;
  children?: ReactNode;
}

export function EmptyStateV2({
  illustration, title, description, ctaLabel, ctaHref, onCtaClick, positive, className, children,
}: EmptyStateV2Props) {
  const Illu = ILLUSTRATIONS[illustration];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-6 text-center',
      className
    )}>
      <Illu />
      <h3 className={cn(
        'mt-5 text-base font-semibold',
        positive ? 'text-brand-navy' : 'text-text-primary'
      )}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-amber hover:underline underline-offset-4"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      )}
      {ctaLabel && !ctaHref && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-amber hover:underline underline-offset-4"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
//  Catálogo de ilustrações
// ───────────────────────────────────────────────────────────────────

const ILLUSTRATIONS: Record<Illustration, () => React.JSX.Element> = {
  'no-alerts': IllustrationNoAlerts,
  'no-machines': IllustrationNoMachines,
  'no-sales': IllustrationNoSales,
  'no-results': IllustrationNoResults,
  'no-data': IllustrationNoData,
};

/**
 * Relógio minimalista com check amber dentro — "tudo respirando bem".
 * Eco da identidade: linhas finas navy + ponto/check sólido amber.
 */
function IllustrationNoAlerts() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden fill="none">
      {/* Círculo externo */}
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.5" className="text-brand-navy/30" />
      {/* Marcas das horas — 12 e 6 */}
      <line x1="60" y1="18" x2="60" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/30" />
      <line x1="60" y1="96" x2="60" y2="102" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/30" />
      <line x1="18" y1="60" x2="24" y2="60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/30" />
      <line x1="96" y1="60" x2="102" y2="60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/30" />
      {/* Selo amber sólido no centro com check */}
      <circle cx="60" cy="60" r="18" fill="#fbbf24" />
      <path d="M52 60.5 L58 66.5 L70 54" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Grid 3x3 (eco do ícone Vending Pro) com 1 célula amber acesa.
 * "Sem máquinas — vamos cadastrar a primeira"
 */
function IllustrationNoMachines() {
  const cells: Array<{ x: number; y: number; amber?: boolean }> = [
    { x: 24, y: 24 }, { x: 52, y: 24 }, { x: 80, y: 24 },
    { x: 24, y: 52 }, { x: 52, y: 52, amber: true }, { x: 80, y: 52 },
    { x: 24, y: 80 }, { x: 52, y: 80 }, { x: 80, y: 80 },
  ];
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden fill="none">
      {cells.map((c, i) => (
        c.amber ? (
          <rect
            key={i}
            x={c.x - 8} y={c.y - 8}
            width="16" height="16" rx="3"
            fill="#fbbf24"
          />
        ) : (
          <rect
            key={i}
            x={c.x - 8} y={c.y - 8}
            width="16" height="16" rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-brand-navy/30"
          />
        )
      ))}
    </svg>
  );
}

/**
 * Carrinho minimalista com ponto amber.
 * "Sem vendas — importe sua planilha"
 */
function IllustrationNoSales() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden fill="none">
      {/* Carrinho — corpo */}
      <path
        d="M28 36 L36 36 L44 70 L88 70 L96 44 L42 44"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-navy/40"
        fill="none"
      />
      {/* Rodas — círculos vazados */}
      <circle cx="50" cy="84" r="4.5" stroke="currentColor" strokeWidth="1.5" className="text-brand-navy/40" />
      <circle cx="80" cy="84" r="4.5" stroke="currentColor" strokeWidth="1.5" className="text-brand-navy/40" />
      {/* Item amber dentro do carrinho */}
      <rect x="60" y="50" width="14" height="14" rx="2" fill="#fbbf24" />
    </svg>
  );
}

/**
 * Lupa com ponto amber.
 * "Busca sem resultado"
 */
function IllustrationNoResults() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden fill="none">
      {/* Lupa */}
      <circle cx="52" cy="52" r="22" stroke="currentColor" strokeWidth="1.5" className="text-brand-navy/30" />
      <line x1="68" y1="68" x2="84" y2="84" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/30" />
      {/* Ponto amber no centro da lupa */}
      <circle cx="52" cy="52" r="5" fill="#fbbf24" />
    </svg>
  );
}

/**
 * Mini gráfico de linha amber subindo (com pontos).
 * "Sem dados ainda — importar primeira planilha"
 */
function IllustrationNoData() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden fill="none">
      {/* Eixos sutis */}
      <line x1="24" y1="92" x2="96" y2="92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/20" />
      <line x1="24" y1="92" x2="24" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-brand-navy/20" />
      {/* Linha amber ascendente */}
      <path
        d="M30 76 L50 60 L70 64 L90 38"
        stroke="#fbbf24"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Pontos amber */}
      <circle cx="30" cy="76" r="3" fill="#fbbf24" />
      <circle cx="50" cy="60" r="3" fill="#fbbf24" />
      <circle cx="70" cy="64" r="3" fill="#fbbf24" />
      <circle cx="90" cy="38" r="4" fill="#fbbf24" />
    </svg>
  );
}
