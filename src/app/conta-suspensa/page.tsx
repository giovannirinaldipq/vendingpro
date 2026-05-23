import Link from 'next/link';
import { AlertTriangle, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ContaSuspensaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isCancelled = params.status === 'cancelled';

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
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
        <CardContent className="space-y-4">
          {!isCancelled && (
            <>
              <p className="text-sm text-muted-foreground">
                Regularize as faturas em aberto e o acesso volta automaticamente.
              </p>
              <Link href="/app/faturas" className="block">
                <Button className="w-full">Ver faturas em aberto</Button>
              </Link>
            </>
          )}
          <a href="mailto:suporte@vendingpro.com.br" className="block">
            <Button variant="outline" className="w-full">Falar com suporte</Button>
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
  );
}
