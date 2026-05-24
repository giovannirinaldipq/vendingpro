import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-base">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
