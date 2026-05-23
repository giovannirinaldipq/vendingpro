import Link from 'next/link';
import { Package, ArrowRight, BarChart3, Bell, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">VendingPro</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/login">
              <Button>Começar Agora</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-20">
        <div className="container mx-auto text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Gestão Inteligente para{' '}
            <span className="text-primary">Vending Machines</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Saiba quando abastecer, o que está vendendo, e se está dando lucro — sem complicação.
            Transforme dados de telemetria em decisões que aumentam seu faturamento.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Começar Gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Ver Demonstração
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            14 dias grátis • Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-background py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold">
            Tudo que você precisa para gerenciar suas máquinas
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Importe seus dados de telemetria e tenha visibilidade completa da sua operação
          </p>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Mapa de Calor</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Descubra os horários e dias que mais vendem em cada máquina
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Alertas Inteligentes</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Receba notificações de queda de vendas, máquina parada e ruptura
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Controle de Equipe</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Acompanhe seus reabastecedores com GPS e fotos de abastecimento
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Controle Financeiro</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Saiba o lucro real de cada máquina com custos e conciliação
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Pronto para começar?</h2>
          <p className="mt-4 text-muted-foreground">
            Junte-se a centenas de operadores que já transformaram sua gestão
          </p>
          <Link href="/login">
            <Button size="lg" className="mt-8">
              Criar Conta Gratuita
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-semibold">VendingPro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 VendingPro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
