'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

type Variant = 'horizontal' | 'stacked' | 'icon';

interface BrandLogoProps {
  variant?: Variant;
  height?: number;
  width?: number;
  className?: string;
  /** Forçar tema (útil para tela de login, sempre stacked-dark) */
  forceTheme?: 'light' | 'dark';
  /** Texto alternativo (accessibility) */
  alt?: string;
  priority?: boolean;
}

/**
 * Componente unificado para o logo VendingPro. Troca automaticamente entre
 * variantes "dark" (fundo navy embedded) e "light" (transparente) com base
 * no tema atual. Usa SVGs em /public/brand/.
 */
export function BrandLogo({
  variant = 'horizontal',
  height,
  width,
  className,
  forceTheme,
  alt = 'VendingPro',
  priority = false,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // SSR-safe: usa light por padrão até hidratar
  const theme = forceTheme ?? (mounted ? resolvedTheme : 'light');

  // Mapa CORRETO:
  // - light  → desenho navy sobre fundo transparente (usar em fundos claros)
  // - dark   → desenho branco sobre fundo transparente (usar em fundos escuros)
  // Os arquivos -dark (01/03/05) têm badge navy embedded e NÃO devem ser usados
  // sobre fundos escuros — eles são pra contextos isolados (post comercial).
  const srcMap = {
    horizontal: {
      light: '/brand/04-vending-pro-horizontal-light.svg',
      dark:  '/brand/10-vending-pro-horizontal-darkmode.svg',
    },
    stacked: {
      light: '/brand/02-vending-pro-stacked-light.svg',
      dark:  '/brand/09-vending-pro-stacked-darkmode.svg',
    },
    icon: {
      light: '/brand/06-vending-pro-icon-light.svg',
      dark:  '/brand/11-vending-pro-icon-darkmode.svg',
    },
  };

  const src = srcMap[variant][theme === 'dark' ? 'dark' : 'light'];

  // Aspect ratios reais dos SVGs (viewBox)
  const aspectRatios = {
    horizontal: 640 / 160, // 4:1
    stacked: 520 / 380,    // 1.37:1
    icon: 1,
  };
  const ar = aspectRatios[variant];

  let finalWidth = width;
  let finalHeight = height;
  if (height && !width) finalWidth = Math.round(height * ar);
  if (width && !height) finalHeight = Math.round(width / ar);
  if (!width && !height) {
    finalHeight = variant === 'horizontal' ? 36 : variant === 'stacked' ? 80 : 40;
    finalWidth = Math.round(finalHeight * ar);
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      priority={priority}
      className={className}
    />
  );
}
