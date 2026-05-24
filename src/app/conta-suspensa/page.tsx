import Link from 'next/link';
import { AlertTriangle, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ContaSuspensaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isCancelled = params.status === 'cancelled';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo variant="horizontal" forceTheme="light" height={40} />
        </div>
        <Card className="shadow-card border-border/60">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cat-amber-soft">
              <AlertTriangle className="h-7 w-7 text-cat-amber" />
            </div>
            <CardTitle className="text-2xl">
              {isCancelled ? 'Conta cancelada' : 'Acesso suspenso'}
            </CardTitle>
            <CardDescription className="mt-2">
              {isCancelled
                ? 'Sua conta foi cancelada. Para reativar, entre em contato com nosso suporte.'
                : 'Seu acesso está temporariamente bloqueado por falta de pagamento. Seus dados continuam preservados.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isCancelled && (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Regularize as faturas em aberto e o acesso volta automaticamente.
                </p>
                <Link href="/app/faturas" className="block">
                  <Button className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold h-11">
                    Ver faturas em aberto
                  </Button>
                </Link>
              </>
            )}
            <a href="mailto:suporte@vendingpro.com.br" className="block">
              <Button variant="outline" className="w-full h-11">Falar com suporte</Button>
            </a>
            <form action="/api/auth/signout" method="post">
              <Button type="submit" variant="ghost" className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
