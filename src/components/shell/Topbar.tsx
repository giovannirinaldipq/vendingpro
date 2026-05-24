'use client';

import Link from 'next/link';
import { Bell, Search, Settings, Shield, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { MobileSidebar } from './MobileSidebar';

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border-default bg-surface-card/95 backdrop-blur-sm px-4 lg:px-6">
      <MobileSidebar />

      {/* Search (placeholder visual — implementação Cmd+K fica pra v2) */}
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
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="sm" className="gap-2 px-2 h-9">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-surface-subtle text-text-secondary text-[11px] font-medium">
                  JS
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-text-primary">João Silva</span>
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem>
              <Link href="/app/configuracoes" className="flex items-center gap-2 w-full">
                <Settings className="h-4 w-4 text-text-tertiary" />Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/app/seguranca" className="flex items-center gap-2 w-full">
                <Shield className="h-4 w-4 text-text-tertiary" />Segurança
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
