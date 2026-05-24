'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, MapPin, Monitor, Package, Boxes,
  FileSpreadsheet, BarChart3, TrendingUp, Bell, Settings,
  LogOut, Menu, ChevronDown, Building2, Users, ClipboardCheck,
  Calculator, Sparkles, Shield, FileSignature, Banknote, FileBarChart,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { BrandLogo } from '@/components/brand/BrandLogo';

type CatColor = 'blue' | 'green' | 'violet' | 'pink' | 'amber' | 'cyan'
  | 'indigo' | 'emerald' | 'slate' | 'teal' | 'orange' | 'purple'
  | 'lime' | 'rose' | 'yellow' | 'red' | 'gray';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  color: CatColor;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Operação',
    items: [
      { name: 'Dashboard', href: '/app', icon: LayoutDashboard, color: 'violet' },
      { name: 'Locais', href: '/app/locais', icon: MapPin, color: 'green' },
      { name: 'Máquinas', href: '/app/maquinas', icon: Monitor, color: 'blue' },
      { name: 'Produtos', href: '/app/produtos', icon: Package, color: 'pink' },
      { name: 'Estoque', href: '/app/estoque', icon: Boxes, color: 'amber' },
    ],
  },
  {
    title: 'Campo',
    items: [
      { name: 'Reabastecedores', href: '/app/reabastecedores', icon: Users, color: 'cyan' },
      { name: 'Visitas', href: '/app/visitas', icon: ClipboardCheck, color: 'indigo' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { name: 'Financeiro', href: '/app/financeiro', icon: Calculator, color: 'emerald' },
      { name: 'Contratos', href: '/app/contratos', icon: FileSignature, color: 'slate' },
      { name: 'Conciliação', href: '/app/conciliacao', icon: Banknote, color: 'teal' },
    ],
  },
  {
    title: 'Inteligência',
    items: [
      { name: 'Sugestões', href: '/app/sugestoes', icon: Sparkles, color: 'orange' },
      { name: 'Analytics', href: '/app/analytics', icon: BarChart3, color: 'rose' },
      { name: 'Rankings', href: '/app/rankings', icon: TrendingUp, color: 'yellow' },
      { name: 'Alertas', href: '/app/alertas', icon: Bell, color: 'red' },
    ],
  },
  {
    title: 'Dados',
    items: [
      { name: 'Importar', href: '/app/importar', icon: FileSpreadsheet, color: 'lime' },
      { name: 'Relatórios', href: '/app/relatorios', icon: FileBarChart, color: 'purple' },
    ],
  },
  {
    title: 'Conta',
    items: [
      { name: 'Segurança', href: '/app/seguranca', icon: Shield, color: 'gray' },
      { name: 'Configurações', href: '/app/configuracoes', icon: Settings, color: 'gray' },
    ],
  },
];

const TEXT_COLOR_MAP: Record<CatColor, string> = {
  blue: 'text-cat-blue', green: 'text-cat-green', violet: 'text-cat-violet',
  pink: 'text-cat-pink', amber: 'text-cat-amber', cyan: 'text-cat-cyan',
  indigo: 'text-cat-indigo', emerald: 'text-cat-emerald', slate: 'text-cat-slate',
  teal: 'text-cat-teal', orange: 'text-cat-orange', purple: 'text-cat-purple',
  lime: 'text-cat-lime', rose: 'text-cat-rose', yellow: 'text-cat-yellow',
  red: 'text-cat-red', gray: 'text-cat-gray',
};
const BG_SOFT_MAP: Record<CatColor, string> = {
  blue: 'bg-cat-blue-soft', green: 'bg-cat-green-soft', violet: 'bg-cat-violet-soft',
  pink: 'bg-cat-pink-soft', amber: 'bg-cat-amber-soft', cyan: 'bg-cat-cyan-soft',
  indigo: 'bg-cat-indigo-soft', emerald: 'bg-cat-emerald-soft', slate: 'bg-cat-slate-soft',
  teal: 'bg-cat-teal-soft', orange: 'bg-cat-orange-soft', purple: 'bg-cat-purple-soft',
  lime: 'bg-cat-lime-soft', rose: 'bg-cat-rose-soft', yellow: 'bg-cat-yellow-soft',
  red: 'bg-cat-red-soft', gray: 'bg-cat-gray-soft',
};

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md transition-all',
          isActive ? BG_SOFT_MAP[item.color] : 'bg-transparent group-hover:' + BG_SOFT_MAP[item.color]
        )}
      >
        <item.icon className={cn('h-4 w-4', isActive ? TEXT_COLOR_MAP[item.color] : 'text-muted-foreground group-hover:' + TEXT_COLOR_MAP[item.color])} />
      </span>
      <span>{item.name}</span>
    </Link>
  );
}

function Sidebar({ tenantName }: { tenantName?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <Link href="/app" className="flex items-center" aria-label="VendingPro — ir para o Dashboard">
          <BrandLogo variant="horizontal" height={32} priority />
        </Link>
      </div>
      {tenantName && (
        <div className="px-5 py-3 border-b border-sidebar-border">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Empresa</p>
          <p className="text-sm font-medium truncate">{tenantName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {navigation.map((section, sIdx) => (
          <div key={section.title} className={sIdx > 0 ? 'mt-6' : ''}>
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Status bar */}
      <div className="border-t border-sidebar-border px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cat-green opacity-60"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cat-green"></span>
          </span>
          <span>Sistema operacional</span>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col border-r border-sidebar-border lg:flex">
        <Sidebar tenantName="Empresa Teste" />
      </aside>

      {/* Sidebar Mobile */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r-0">
          <Sidebar tenantName="Empresa Teste" />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-6">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="flex-1" />

          <ThemeToggle />

          <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cat-red text-[10px] font-semibold text-white">
              2
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-8 w-8 bg-gradient-brand text-white">
                  <AvatarFallback className="bg-transparent text-white font-semibold text-xs">JS</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block">João Silva</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <Link href="/app/configuracoes" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/app/seguranca" className="flex items-center w-full">
                  <Shield className="mr-2 h-4 w-4" />Segurança
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <form action="/api/auth/signout" method="post" className="w-full">
                  <button type="submit" className="flex items-center w-full">
                    <LogOut className="mr-2 h-4 w-4" />Sair
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
