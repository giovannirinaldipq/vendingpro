'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, AlertCircle, Clock, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { EmptyStateV2 } from '@/components/ui/empty-state-v2';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Visit {
  id: string;
  checkin_at: string;
  checkout_at: string | null;
  duration_minutes: number | null;
  is_location_valid: boolean | null;
  is_duration_valid: boolean | null;
  checkin_distance_meters: number | null;
  checkin_photo_url: string | null;
  checkout_photo_url: string | null;
  machine: { id: string; name: string; code: string } | null;
  restocker: { id: string; name: string } | null;
}

export default function VisitsPage() {
  const [rows, setRows] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const sp = new URLSearchParams();
      if (statusFilter !== 'all') sp.set('status', statusFilter);
      const res = await fetch(`/api/app/visits?${sp}`);
      const json = await res.json();
      setRows(json.data ?? []);
      setLoading(false);
    })();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visitas</h1>
        <p className="text-sm text-text-secondary">Histórico de abastecimentos com GPS e fotos antes/depois.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue>
                {statusFilter === 'all' ? 'Todas'
                 : statusFilter === 'open' ? 'Em andamento'
                 : statusFilter === 'closed' ? 'Concluídas'
                 : 'Filtrar'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="open">Em andamento</SelectItem>
              <SelectItem value="closed">Concluídas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            <span className="tabular-nums">{rows.length}</span> visita{rows.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-text-tertiary" /></div>
          ) : rows.length === 0 ? (
            <EmptyStateV2
              illustration="no-data"
              title="Sem visitas no filtro selecionado"
              description="Quando seus reabastecedores fizerem check-in nas máquinas, as visitas aparecem aqui com foto antes/depois e validação de GPS."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Reabastecedor</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Validações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.machine?.name ?? '—'}</div>
                      <div className="text-xs font-mono tabular-nums text-text-tertiary">{v.machine?.code}</div>
                    </TableCell>
                    <TableCell>{v.restocker?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm tabular-nums">{new Date(v.checkin_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      {v.duration_minutes != null ? (
                        <span className="font-mono tabular-nums text-sm">{v.duration_minutes} min</span>
                      ) : (
                        <Pill tone="warning" size="sm" dot>
                          <Clock className="h-3 w-3" />Em curso
                        </Pill>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {v.is_location_valid === false ? (
                          <Pill tone="danger" size="sm">
                            <AlertCircle className="h-3 w-3" />Fora de raio ({v.checkin_distance_meters}m)
                          </Pill>
                        ) : v.checkin_distance_meters != null ? (
                          <Pill tone="success" size="sm">
                            <MapPin className="h-3 w-3" />{v.checkin_distance_meters}m
                          </Pill>
                        ) : (
                          <Pill tone="neutral" size="sm">Sem GPS</Pill>
                        )}
                        {v.is_duration_valid === false && v.duration_minutes != null && (
                          <Pill tone="warning" size="sm">
                            <AlertCircle className="h-3 w-3" />Tempo atípico
                          </Pill>
                        )}
                        {v.checkin_photo_url && v.checkout_photo_url && (
                          <Pill tone="amber" size="sm" dot>
                            <Camera className="h-3 w-3" />2 fotos
                          </Pill>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/app/visitas/${v.id}`} className="text-sm font-medium text-brand-navy hover:underline">
                        Ver detalhes
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
