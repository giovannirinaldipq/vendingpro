'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Bell, Search, Settings, LogOut, ChevronDown } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AdminSidebar } from './AdminSidebar';
import { cn } from '@/lib/utils';

export function AdminTopbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-default bg-surface-card/95 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'lg:hidden')}
          aria-label="Abrir menu"
        >
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 border-r-0">
          <div className="lg:hidden h-full block">
            <div className="block h-full [&>aside]:flex [&>aside]:w-full">
              <AdminSidebar />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Pill tone="amber" size="sm">Backoffice</Pill>

      <div className="hidden md:flex flex-1 max-w-md">
        <button
          className="group flex h-9 w-full items-center gap-2 rounded-md border border-border-default bg-surface-base px-3 text-sm text-text-tertiary transition-colors hover:border-border-strong hover:text-text-secondary"
          type="button"
          aria-label="Buscar"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border-default bg-surface-card px-1.5 h-5 text-[10px] font-mono text-text-tertiary">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="md:flex-1" />

      <div className="flex items-center gap-1">
        <ThemeToggle />

        <Link
          href="/admin/cobranca"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'relative')}
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute right-1 top-1 inline-flex h-1.5 w-1.5">
            <span aria-hidden className="absolute inset-0 rounded-full bg-brand-amber animate-machine-pulse" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-amber" />
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2 px-2 h-9')}
            aria-label="Menu da conta admin"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-brand-amber-100 text-brand-amber-800 text-[11px] font-semibold">
                AD
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium text-text-primary">Admin</span>
            <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem>
              <Link href="/admin/configuracoes" className="flex items-center gap-2 w-full">
                <Settings className="h-4 w-4 text-text-tertiary" />Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <form action="/api/auth/signout" method="post" className="w-full">
                <button type="submit" className="flex items-center gap-2 w-full text-left">
                  <LogOut className="h-4 w-4" />Sair
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
