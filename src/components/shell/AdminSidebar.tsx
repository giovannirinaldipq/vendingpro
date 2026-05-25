'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Package, FileText, CreditCard, Zap,
  Settings, ShieldCheck, PanelLeftClose, PanelLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Pill } from '@/components/ui/pill';

interface NavItem { name: string; href: string; icon: LucideIcon; }
interface NavSection { title: string; items: NavItem[]; }

const navigation: NavSection[] = [
  {
    title: 'Operação',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { name: 'Clientes', href: '/admin/clientes', icon: Users },
      { name: 'Planos', href: '/admin/planos', icon: Package },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { name: 'Faturas', href: '/admin/faturas', icon: FileText },
      { name: 'Pagamentos', href: '/admin/pagamentos', icon: CreditCard },
      { name: 'Cobrança', href: '/admin/cobranca', icon: Zap },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { name: 'Usuários', href: '/admin/usuarios', icon: ShieldCheck },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
    ],
  },
];

const STORAGE_KEY = 'vp_admin_sidebar_collapsed';

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed, mounted]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed(c => !c);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex h-screen flex-col border-r border-border-default bg-surface-card transition-[width] duration-200',
        collapsed ? 'w-[64px]' : 'w-[240px]'
      )}
      aria-label="Navegação do backoffice"
    >
      {/* Brand */}
      <div className={cn(
        'flex h-16 items-center border-b border-border-default',
        collapsed ? 'justify-center px-2' : 'px-5 pt-1 gap-2'
      )}>
        <Link href="/admin" className="flex items-center" aria-label="Vending Pro Backoffice">
          {collapsed ? (
            <BrandLogo variant="icon" height={32} priority />
          ) : (
            <BrandLogo variant="horizontal" height={28} priority />
          )}
        </Link>
        {!collapsed && (
          <span className="ml-1 inline-flex items-center rounded-full bg-brand-amber/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92400e] dark:text-brand-amber">
            Admin
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {navigation.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'mt-5' : 'mt-1'}>
            {!collapsed && (
              <div className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                {section.title}
              </div>
            )}
            {collapsed && sIdx > 0 && <div className="mx-3 my-2 h-px bg-border-default" />}
            <div className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-2.5')}>
              {section.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      'group relative flex items-center text-sm font-medium transition-colors',
                      collapsed ? 'h-9 w-9 justify-center mx-auto rounded-md' : 'gap-3 px-3 h-9 rounded-md',
                      active
                        ? 'bg-brand-navy text-white'
                        : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                    )}
                  >
                    {/* Barra amber esquerda no ativo — assinatura visual */}
                    {active && !collapsed && (
                      <span aria-hidden className="absolute -left-2.5 top-1 bottom-1 w-1 rounded-r-full bg-brand-amber" />
                    )}
                    {active && collapsed && (
                      <span aria-hidden className="absolute -left-2 top-1 bottom-1 w-1 rounded-r-full bg-brand-amber" />
                    )}
                    <item.icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={active ? 2 : 1.5}
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer + collapse */}
      <div className="border-t border-border-default">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-amber-100 text-[11px] font-semibold text-brand-amber-800">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-text-primary leading-tight">Admin</p>
              <p className="truncate text-[10px] text-text-tertiary leading-tight">Backoffice</p>
            </div>
            <Pill tone="amber" size="sm">Staff</Pill>
          </div>
        )}

        <div className="p-2 border-t border-border-default">
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            title={collapsed ? 'Expandir (⌘B)' : 'Recolher (⌘B)'}
            className={cn(
              'group flex w-full items-center rounded-md text-xs font-medium transition-colors',
              'text-text-tertiary hover:bg-surface-subtle hover:text-text-secondary',
              collapsed ? 'h-8 justify-center' : 'h-8 px-2.5 gap-2 justify-between'
            )}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <PanelLeftClose className="h-4 w-4" />
                  Recolher
                </span>
                <kbd className="hidden sm:inline-flex items-center rounded border border-border-default bg-surface-base px-1.5 h-5 text-[10px] font-mono text-text-tertiary">
                  ⌘B
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
