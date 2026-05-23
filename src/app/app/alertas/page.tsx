'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  Loader2,
  Check,
  X,
  Eye,
  Monitor,
  Filter,
  Cpu,
  Hand,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Machine {
  id: string;
  code: string;
  name: string;
}

interface Alert {
  id: string;
  machine_id?: string;
  machine?: Machine;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  source?: 'auto' | 'manual';
  acknowledged_at?: string;
  resolved_at?: string;
  notified_email?: boolean;
  created_at: string;
}

interface AlertStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
  stats: AlertStats;
}

const severityConfig = {
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  high: { label: 'Alto', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertCircle },
  medium: { label: 'Médio', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Info },
  low: { label: 'Baixo', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info },
};

const statusConfig = {
  active: { label: 'Ativo', color: 'bg-red-100 text-red-700' },
  acknowledged: { label: 'Reconhecido', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolvido', color: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Dispensado', color: 'bg-gray-100 text-gray-700' },
};

const alertTypeLabels: Record<string, string> = {
  machine_stopped: 'Máquina Parada',
  sales_drop: 'Queda de Vendas',
  rupture_imminent: 'Ruptura Iminente',
  product_stale: 'Produto Parado',
  contract_expiring: 'Contrato Expirando',
  machine_loss: 'Máquina com Prejuízo',
  other: 'Outro',
};

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState('active');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      if (severityFilter !== 'all') {
        params.set('severity', severityFilter);
      }

      const response = await fetch(`/api/app/alerts?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || 'Erro ao carregar alertas');
      }
    } catch {
      toast.error('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleAction = async (alertId: string, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/app/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (result.success) {
        const actionLabels = {
          acknowledge: 'reconhecido',
          resolve: 'resolvido',
          dismiss: 'dispensado',
        };
        toast.success(`Alerta ${actionLabels[action]} com sucesso!`);
        setSelectedAlert(null);
        fetchAlerts();
      } else {
        toast.error(result.error?.message || 'Erro ao processar alerta');
      }
    } catch {
      toast.error('Erro ao processar alerta');
    } finally {
      setIsProcessing(false);
    }
  };

  const SeverityIcon = (severity: Alert['severity']) => {
    const Icon = severityConfig[severity]?.icon || Info;
    return Icon;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground">
            Monitore alertas e notificações do sistema
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className={data.stats.active > 0 ? 'border-red-200' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ativos
              </CardTitle>
              <Bell className={`h-4 w-4 ${data.stats.active > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.stats.active > 0 ? 'text-red-600' : ''}`}>
                {data.stats.active}
              </div>
            </CardContent>
          </Card>

          <Card className={data.stats.critical > 0 ? 'border-red-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Críticos
              </CardTitle>
              <AlertTriangle className={`h-4 w-4 ${data.stats.critical > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.stats.critical > 0 ? 'text-red-600' : ''}`}>
                {data.stats.critical}
              </div>
            </CardContent>
          </Card>

          <Card className={data.stats.high > 0 ? 'border-orange-300' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Altos
              </CardTitle>
              <AlertCircle className={`h-4 w-4 ${data.stats.high > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.stats.high > 0 ? 'text-orange-600' : ''}`}>
                {data.stats.high}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Médios
              </CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.medium}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Baixos
              </CardTitle>
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.low}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="acknowledged">Reconhecidos</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="dismissed">Dispensados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => v && setSeverityFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <AlertTriangle className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alertas</CardTitle>
          <CardDescription>
            {loading ? 'Carregando...' : `${data?.total || 0} alerta(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.alerts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">Nenhum alerta encontrado</p>
              <p className="text-xs text-muted-foreground">
                Os alertas aparecerão aqui quando forem gerados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.alerts.map((alert) => {
                  const Icon = SeverityIcon(alert.severity);
                  return (
                    <TableRow key={alert.id} className={alert.status === 'active' ? 'bg-red-50/50' : ''}>
                      <TableCell>
                        <Badge className={severityConfig[alert.severity]?.color}>
                          <Icon className="mr-1 h-3 w-3" />
                          {severityConfig[alert.severity]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {alert.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.source === 'auto' ? (
                          <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                            <Cpu className="mr-1 h-3 w-3" />Auto
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            <Hand className="mr-1 h-3 w-3" />Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {alert.machine ? (
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{alert.machine.code}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {alertTypeLabels[alert.alert_type] || alert.alert_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[alert.status]?.color}>
                          {statusConfig[alert.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && (
                <>
                  <Badge className={severityConfig[selectedAlert.severity]?.color}>
                    {severityConfig[selectedAlert.severity]?.label}
                  </Badge>
                  {selectedAlert.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedAlert?.message}
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {alertTypeLabels[selectedAlert.alert_type] || selectedAlert.alert_type}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedAlert.status]?.color}>
                    {statusConfig[selectedAlert.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Máquina</p>
                  <p className="font-medium">
                    {selectedAlert.machine
                      ? `${selectedAlert.machine.code} - ${selectedAlert.machine.name}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {new Date(selectedAlert.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {selectedAlert.data && Object.keys(selectedAlert.data).length > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Dados adicionais</p>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(selectedAlert.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedAlert?.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction(selectedAlert.id, 'dismiss')}
                  disabled={isProcessing}
                >
                  <X className="mr-2 h-4 w-4" />
                  Dispensar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction(selectedAlert.id, 'acknowledge')}
                  disabled={isProcessing}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Reconhecer
                </Button>
                <Button
                  onClick={() => handleAction(selectedAlert.id, 'resolve')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Resolver
                </Button>
              </>
            )}
            {selectedAlert?.status === 'acknowledged' && (
              <Button
                onClick={() => handleAction(selectedAlert.id, 'resolve')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Resolver
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
