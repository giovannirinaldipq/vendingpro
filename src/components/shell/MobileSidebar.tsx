'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
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
            <Sidebar />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
