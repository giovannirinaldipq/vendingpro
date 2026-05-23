'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <h1 className="text-2xl font-bold">Visitas</h1>
        <p className="text-sm text-muted-foreground">Histórico de abastecimentos com GPS e fotos.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={v => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
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
          <CardDescription>{rows.length} visita{rows.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma visita encontrada.</div>
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
                      <div className="text-xs text-muted-foreground">{v.machine?.code}</div>
                    </TableCell>
                    <TableCell>{v.restocker?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{new Date(v.checkin_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      {v.duration_minutes != null ? `${v.duration_minutes} min` : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Clock className="mr-1 h-3 w-3" />Em curso</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {v.is_location_valid === false
                          ? <Badge className="bg-red-100 text-red-700"><AlertCircle className="mr-1 h-3 w-3" />Fora de raio ({v.checkin_distance_meters}m)</Badge>
                          : v.checkin_distance_meters != null
                            ? <Badge className="bg-green-100 text-green-700"><MapPin className="mr-1 h-3 w-3" />{v.checkin_distance_meters}m</Badge>
                            : <Badge variant="secondary">Sem GPS</Badge>}
                        {v.is_duration_valid === false && v.duration_minutes != null && (
                          <Badge className="bg-amber-100 text-amber-700"><AlertCircle className="mr-1 h-3 w-3" />Tempo atípico</Badge>
                        )}
                        {v.checkin_photo_url && v.checkout_photo_url && (
                          <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />2 fotos</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/app/visitas/${v.id}`}>
                        <span className="text-sm text-primary hover:underline">Ver detalhes</span>
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
