import { AppShell } from '@/components/shell/AppShell';

// Todas as páginas em /app/* dependem de sessão + tenant — não faz sentido prerender.
// force-dynamic evita que o build do Next tente executar essas rotas em CI
// (que crasha sem env vars do Supabase).
export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
