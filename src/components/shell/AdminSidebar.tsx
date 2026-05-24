'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Package, FileText, CreditCard, Zap,
  Settings, ShieldCheck, PanelLeftClose, PanelLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
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
        collapsed ? 'justify-center px-2' : 'px-5 gap-2'
      )}>
        <Link href="/admin" className="flex items-center" aria-label="Vending Pro Backoffice">
          {collapsed ? (
            <Image
              src="/brand/06-vending-pro-icon-light.svg"
              alt="Vending Pro"
              width={32} height={32}
              priority
            />
          ) : (
            <Image
              src="/brand/04-vending-pro-horizontal-light.svg"
              alt="Vending Pro"
              width={128} height={32}
              priority
            />
          )}
        </Link>
        {!collapsed && (
          <Pill tone="amber" size="sm" className="ml-1">Admin</Pill>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4">
        {navigation.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'mt-6' : ''}>
            {!collapsed && (
              <div className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                {section.title}
              </div>
            )}
            {collapsed && sIdx > 0 && <div className="mx-2 my-2 h-px bg-border-default" />}
            <div className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
              {section.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                      collapsed ? 'h-9 w-9 justify-center mx-auto' : 'px-3 h-9',
                      active
                        ? 'bg-brand-navy text-white'
                        : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                    )}
                  >
                    <item.icon
                      className="h-[18px] w-[18px] shrink-0"
                      strokeWidth={active ? 2 : 1.75}
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse */}
      <div className={cn('border-t border-border-default p-2', collapsed && 'flex justify-center')}>
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          title="Cmd+B"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
