'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, Check, Home, Package, Monitor, MapPin, Users, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'in_progress' | 'completed';
  action?: string;
  href?: string;
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Bem-vindo ao Vending Pro',
      description: 'Vamos configurar sua conta para começar a gerenciar suas máquinas de venda',
      icon: Home,
      status: 'pending',
    },
    {
      id: 'machines',
      title: 'Cadastrar Máquinas',
      description: 'Adicione suas máquinas com códigos únicos para identificação',
      icon: Monitor,
      status: 'pending',
      action: 'Cadastrar 3 máquinas',
      href: '/app/maquinas/nova',
    },
    {
      id: 'locations',
      title: 'Definir Locais',
      description: 'Cadastre os pontos comerciais onde suas máquinas estão instaladas',
      icon: MapPin,
      status: 'pending',
      action: 'Cadastrar 2 locais',
      href: '/app/locais/novo',
    },
    {
      id: 'products',
      title: 'Cadastrar Produtos',
      description: 'Adicione itens ao seu catálogo com preços de custo e venda',
      icon: Package,
      status: 'pending',
      action: 'Cadastrar 10 produtos',
      href: '/app/produtos/novo',
    },
    {
      id: 'inventory',
      title: 'Configurar Estoque',
      description: 'Defina quantidades mínimas e inicie seu controle de inventário',
      icon: Calculator,
      status: 'pending',
      action: 'Configurar estoque inicial',
      href: '/app/estoque',
    },
    {
      id: 'restockers',
      title: 'Adicionar Equipe',
      description: 'Cadastre reabastecedores para visitas às máquinas',
      icon: Users,
      status: 'pending',
      action: 'Cadastrar 1 reabastecedor',
      href: '/app/reabastecedores/novo',
    },
    {
      id: 'finance',
      title: 'Configurações Financeiras',
      description: 'Defina taxas e configurações de pagamento',
      icon: Calculator,
      status: 'pending',
      action: 'Configurar taxas',
      href: '/app/financeiro',
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Verificar progresso real
  useEffect(() => {
    checkProgress();
  }, []);

  const checkProgress = async () => {
    setLoading(true);
    try {
      // Verificar máquinas
      const machinesRes = await fetch('/api/app/machines');
      const machinesData = await machinesRes.json();
      const machineCount = machinesData.success ? machinesData.data.machines.length : 0;

      // Verificar locais
      const locationsRes = await fetch('/api/app/locations');
      const locationsData = await locationsRes.json();
      const locationCount = locationsRes.ok ? locationsData.data.length : 0;

      // Verificar produtos
      const productsRes = await fetch('/api/app/products');
      const productsData = await productsRes.json();
      const productCount = productsRes.ok ? productsData.data.products.length : 0;

      // Verificar reabastecedores
      const restockersRes = await fetch('/api/app/restockers');
      const restockersData = await restockersRes.json();
      const restockerCount = restockersRes.ok ? restockersData.data.length : 0;

      // Atualizar status dos steps
      setSteps(prev => prev.map(step => {
        if (step.id === 'machines' && machineCount >= 3) return { ...step, status: 'completed' };
        if (step.id === 'locations' && locationCount >= 2) return { ...step, status: 'completed' };
        if (step.id === 'products' && productCount >= 10) return { ...step, status: 'completed' };
        if (step.id === 'restockers' && restockerCount >= 1) return { ...step, status: 'completed' };
        return step;
      }));

      // Encontrar próximo step pendente
      const nextPending = prev.findIndex(step => step.status === 'pending');
      if (nextPending !== -1) {
        setCurrentStep(nextPending);
      }
    } catch (error) {
      console.error('Erro ao verificar progresso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (href: string) => {
    window.location.href = href;
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Configuração Inicial</h1>
        <p className="text-muted-foreground">
          Vamos guiar você pelo processo de configuração do Vending Pro
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progresso</span>
          <span>{Math.round(progress)}% completo</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Welcome Card */}
      {currentStep === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Home className="h-5 w-5" />
              Bem-vindo ao Vending Pro!
            </CardTitle>
            <CardDescription className="text-blue-700">
              Estamos animados em tê-lo(a) a bordo. Este guia irá ajudá-lo(a) a configurar
              tudo o que precisa para começar a gerenciar suas máquinas de venda de forma eficiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setCurrentStep(1)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Começar Configuração
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.slice(currentStep).map((step, index) => (
          <Card
            key={step.id}
            className={`transition-all ${
              step.status === 'completed' ? 'border-green-200 bg-green-50' :
              step.status === 'in_progress' ? 'border-blue-200 bg-blue-50' : ''
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : step.status === 'in_progress' ? (
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    {step.status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Concluído
                      </Badge>
                    )}
                    {step.status === 'in_progress' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Em progresso
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  {step.action && step.status !== 'completed' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{step.action}</span>
                      {step.href && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(step.href!)}
                        >
                          {step.status === 'in_progress' ? 'Continuar' : 'Começar'}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Message */}
      {completedSteps === steps.length && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-green-800">Parabéns!</h3>
                <p className="text-green-700">
                  Você completou a configuração inicial do Vending Pro.
                  Sua conta está pronta para começar a gerenciar suas máquinas.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.href = '/app'}>
                  Ir para o Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/app/maquinas'}>
                  Ver Minhas Máquinas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dicas de Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>Códigos de Máquina:</strong> Use códicos curtos e fáceis de lembrar para suas máquinas
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>Preços de Custo:</strong> Cadastre o custo real de cada produto para cálculos precisos de CMV
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>Quantidades Mínimas:</strong> Defina estoques mínimos para evitar falta de produtos
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}