import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Pill } from '@/components/ui/pill';
import { buttonVariants } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Layout do Reabastecedor — minimal, mobile-first.
 * Sem sidebar — só topbar com identidade + logout.
 */
export default function RestockerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-base">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-default bg-surface-card/95 backdrop-blur-sm px-4">
        <Link href="/r/visitas" className="flex items-center gap-2">
          <BrandLogo variant="icon" height={28} />
          <span className="hidden sm:inline text-sm font-semibold text-text-primary">VendingPro</span>
        </Link>
        <Pill tone="navy" size="sm">Reabastecedor</Pill>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
