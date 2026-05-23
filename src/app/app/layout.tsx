'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Monitor,
  Package,
  Boxes,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Building2,
  Users,
  ClipboardCheck,
  Calculator,
  Sparkles,
  Shield,
  FileSignature,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Locais', href: '/app/locais', icon: MapPin },
  { name: 'Máquinas', href: '/app/maquinas', icon: Monitor },
  { name: 'Produtos', href: '/app/produtos', icon: Package },
  { name: 'Estoque', href: '/app/estoque', icon: Boxes },
  { name: 'Reabastecedores', href: '/app/reabastecedores', icon: Users },
  { name: 'Visitas', href: '/app/visitas', icon: ClipboardCheck },
  { name: 'Financeiro', href: '/app/financeiro', icon: Calculator },
  { name: 'Contratos', href: '/app/contratos', icon: FileSignature },
  { name: 'Conciliação', href: '/app/conciliacao', icon: Banknote },
  { name: 'Sugestões', href: '/app/sugestoes', icon: Sparkles },
  { name: 'Importar Dados', href: '/app/importar', icon: FileSpreadsheet },
  { name: 'Analytics', href: '/app/analytics', icon: BarChart3 },
  { name: 'Rankings', href: '/app/rankings', icon: TrendingUp },
  { name: 'Alertas', href: '/app/alertas', icon: Bell },
  { name: 'Segurança', href: '/app/seguranca', icon: Shield },
  { name: 'Configurações', href: '/app/configuracoes', icon: Settings },
];

function NavItem({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  );
}

function Sidebar({ className, tenantName }: { className?: string; tenantName?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn('flex h-full flex-col gap-2', className)}>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/app" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg">VendingPro</span>
        </Link>
      </div>
      {tenantName && (
        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="text-sm font-medium truncate">{tenantName}</p>
        </div>
      )}
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2 lg:px-4">
          {navigation.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))}
            />
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Sistema operacional</span>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
        <Sidebar tenantName="Minha Empresa" />
      </aside>

      {/* Sidebar Mobile */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar tenantName="Minha Empresa" />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="flex-1" />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              2
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>US</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block">Usuário</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
