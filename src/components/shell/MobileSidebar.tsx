'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menu">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0 border-r-0">
        <div className="lg:hidden h-full block">
          {/* Sidebar é hidden lg:flex por padrão; precisamos forçar visible aqui */}
          <div className="block h-full [&>aside]:flex [&>aside]:w-full">
            <Sidebar />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
