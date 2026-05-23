'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSave() {
    setIsLoading(true);
    // Simular salvamento
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Configurações salvas com sucesso!');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="billing">Cobrança</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Dados que aparecem nas faturas e comunicações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input id="company_name" defaultValue="VendingPro" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="00.000.000/0001-00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" defaultValue="Rua Exemplo, 123 - São Paulo, SP" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contato</Label>
                  <Input id="email" type="email" defaultValue="contato@vendingpro.com.br" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue="(11) 99999-9999" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações de Trial</CardTitle>
              <CardDescription>
                Período de teste para novos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trial_days">Dias de Trial</Label>
                  <Input id="trial_days" type="number" defaultValue="14" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trial_features">Funcionalidades no Trial</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas (Plano Completo)</SelectItem>
                      <SelectItem value="pro">Plano Profissional</SelectItem>
                      <SelectItem value="basic">Plano Essencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Régua de Cobrança</CardTitle>
              <CardDescription>
                Configure os prazos de cobrança e suspensão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reminder_before">Lembrete antes do vencimento</Label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia antes</SelectItem>
                      <SelectItem value="3">3 dias antes</SelectItem>
                      <SelectItem value="5">5 dias antes</SelectItem>
                      <SelectItem value="7">7 dias antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_reminder">Primeiro lembrete de atraso</Label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 dia após</SelectItem>
                      <SelectItem value="3">3 dias após</SelectItem>
                      <SelectItem value="5">5 dias após</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="suspension_days">Suspensão após</Label>
                  <Select defaultValue="15">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation_days">Cancelamento após</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gateway de Pagamento</CardTitle>
              <CardDescription>
                Configurações de integração com o gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gateway">Gateway</Label>
                <Select defaultValue="asaas">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asaas">Asaas</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="pagseguro">PagSeguro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input id="api_key" type="password" placeholder="••••••••••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_secret">Webhook Secret</Label>
                <Input id="webhook_secret" type="password" placeholder="••••••••••••••••" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>
                Configurações de envio de email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email_provider">Provedor</Label>
                <Select defaultValue="resend">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="ses">Amazon SES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_api_key">API Key</Label>
                <Input id="email_api_key" type="password" placeholder="••••••••••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_from">Email de Envio</Label>
                <Input id="email_from" type="email" defaultValue="noreply@vendingpro.com.br" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Configurações de integração com WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_provider">Provedor</Label>
                <Select defaultValue="none">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não configurado</SelectItem>
                    <SelectItem value="official">API Oficial</SelectItem>
                    <SelectItem value="zapi">Z-API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp_token">Token</Label>
                <Input id="whatsapp_token" type="password" placeholder="••••••••••••••••" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrações Disponíveis</CardTitle>
              <CardDescription>
                Configure integrações com sistemas externos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">VM PAY</p>
                    <p className="text-sm text-muted-foreground">
                      Integração direta com sistema de telemetria
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Em breve
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">VendPago</p>
                    <p className="text-sm text-muted-foreground">
                      Integração direta com sistema de telemetria
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Em breve
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Google Sheets</p>
                    <p className="text-sm text-muted-foreground">
                      Exportação automática de dados
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Em breve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
