'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Toggle de tema com dois affordances:
 * - Clique direto no botão = alterna light ↔ dark (1-click, mais visível)
 * - Clique no chevron pequeno = abre dropdown com light/dark/sistema
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? resolvedTheme : 'light';
  const isDark = current === 'dark';

  function quickToggle() {
    // Se está em "system", ancora no oposto do resolvido pra sair do auto
    setTheme(isDark ? 'light' : 'dark');
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={quickToggle}
        aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        title={isDark ? 'Tema claro' : 'Tema escuro'}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'rounded-r-none border-r border-border-default'
        )}
      >
        {mounted && isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
            'rounded-l-none w-6 px-0'
          )}
          aria-label="Opções de tema"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />Claro
            {theme === 'light' && <span className="ml-auto text-xs text-text-tertiary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />Escuro
            {theme === 'dark' && <span className="ml-auto text-xs text-text-tertiary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />Sistema
            {theme === 'system' && <span className="ml-auto text-xs text-text-tertiary">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
