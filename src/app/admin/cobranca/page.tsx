'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

interface CronResult {
  trials_processed: number;
  invoices_generated: number;
  invoices_marked_overdue: number;
  tenants_suspended: number;
  errors: string[];
}

export default function BillingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CronResult | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function runBillingCron() {
    setIsRunning(true);

    try {
      const response = await fetch('/api/cron/billing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setLastResult(result.data);
        setLastRun(new Date().toLocaleString('pt-BR'));
        toast.success('Régua de cobrança executada com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao executar régua de cobrança');
        if (result.details) {
          setLastResult(result.details);
        }
      }
    } catch {
      toast.error('Erro ao executar régua de cobrança');
    } finally {
      setIsRunning(false);
    }
  }

  const steps = [
    {
      title: 'Trials Expirando',
      description: 'Converte trials expirados para ativos (com plano) ou suspensos (sem plano)',
      icon: Clock,
      value: lastResult?.trials_processed,
    },
    {
      title: 'Faturas Geradas',
      description: 'Gera faturas mensais para clientes ativos no dia de cobrança',
      icon: FileText,
      value: lastResult?.invoices_generated,
    },
    {
      title: 'Faturas Vencidas',
      description: 'Marca faturas pendentes vencidas como inadimplentes',
      icon: AlertTriangle,
      value: lastResult?.invoices_marked_overdue,
    },
    {
      title: 'Clientes Suspensos',
      description: 'Suspende clientes com faturas vencidas há mais de 30 dias',
      icon: Ban,
      value: lastResult?.tenants_suspended,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Régua de Cobrança</h1>
          <p className="text-muted-foreground">
            Automação de faturamento e gestão de inadimplência
          </p>
        </div>
        <Button onClick={runBillingCron} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Executar Agora
            </>
          )}
        </Button>
      </div>

      {/* Status */}
      {lastRun && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-sm text-muted-foreground">
                Última execução: {lastRun}
              </span>
              {lastResult?.errors && lastResult.errors.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {lastResult.errors.length} erro(s)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{step.title}</CardTitle>
              <step.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {step.value !== undefined ? step.value : '-'}
              </div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Errors */}
      {lastResult?.errors && lastResult.errors.length > 0 && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="text-danger">Erros na Execução</CardTitle>
            <CardDescription>
              Os seguintes erros ocorreram durante a execução
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lastResult.errors.map((error, index) => (
                <li key={index} className="text-sm text-danger">
                  • {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
          <CardDescription>
            A régua de cobrança é executada automaticamente todos os dias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info-soft text-info">
              1
            </div>
            <div>
              <p className="font-medium">Trials Expirando</p>
              <p className="text-sm text-muted-foreground">
                Clientes em trial que atingiram o fim do período são convertidos para ativos
                (se tiverem plano) ou suspensos (se não tiverem).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info-soft text-info">
              2
            </div>
            <div>
              <p className="font-medium">Geração de Faturas</p>
              <p className="text-sm text-muted-foreground">
                No dia de cobrança de cada cliente, uma fatura é gerada automaticamente
                com base no número de máquinas ativas e o plano contratado.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-soft text-warning">
              3
            </div>
            <div>
              <p className="font-medium">Marcação de Inadimplência</p>
              <p className="text-sm text-muted-foreground">
                Faturas pendentes que passaram da data de vencimento são marcadas como
                inadimplentes e o cliente é notificado.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-soft text-danger">
              4
            </div>
            <div>
              <p className="font-medium">Suspensão</p>
              <p className="text-sm text-muted-foreground">
                Clientes com faturas vencidas há mais de 30 dias são suspensos
                automaticamente e perdem acesso ao sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
