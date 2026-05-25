'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Clock, User, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VisitDetail {
  id: string;
  checkin_at: string;
  checkout_at: string | null;
  duration_minutes: number | null;
  is_location_valid: boolean | null;
  is_duration_valid: boolean | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkin_distance_meters: number | null;
  checkin_photo_url: string | null;
  checkout_photo_url: string | null;
  notes: string | null;
  machine: { id: string; name: string; code: string; location?: { name: string; latitude?: number; longitude?: number } | null } | null;
  restocker: { id: string; name: string; phone?: string | null } | null;
  items: Array<{ id: string; product_id: string; quantity: number; suggested_quantity: number | null; product_name: string | null; product?: { name: string } | null }>;
}

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/app/visits/${id}`)
      .then(r => r.json())
      .then(json => setVisit(json.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!visit) {
    return <div className="text-center py-12 text-muted-foreground">Visita não encontrada.</div>;
  }

  const status = visit.checkout_at ? 'Concluída' : 'Em andamento';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/app/visitas" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{visit.machine?.name ?? 'Máquina removida'}</span>
            <Badge className={visit.checkout_at ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}>{status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />Reabastecedor</div>
              <div className="font-medium">{visit.restocker?.name ?? '—'}</div>
              {visit.restocker?.phone && <div className="text-xs text-muted-foreground">{visit.restocker.phone}</div>}
            </div>
            <div>
              <div className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Duração</div>
              <div className="font-medium">{visit.duration_minutes != null ? `${visit.duration_minutes} min` : 'Em curso'}</div>
              {visit.is_duration_valid === false && <div className="text-xs text-warning">Atípica</div>}
            </div>
            <div>
              <div className="text-muted-foreground">Check-in</div>
              <div className="font-medium">{new Date(visit.checkin_at).toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Check-out</div>
              <div className="font-medium">{visit.checkout_at ? new Date(visit.checkout_at).toLocaleString('pt-BR') : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Distância do local</div>
              <div className="font-medium">
                {visit.checkin_distance_meters != null
                  ? <span className={visit.is_location_valid === false ? 'text-danger' : ''}>{visit.checkin_distance_meters}m{visit.is_location_valid === false ? ' (fora do raio)' : ''}</span>
                  : 'Sem GPS'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Coordenadas check-in</div>
              <div className="font-mono text-xs">
                {visit.checkin_latitude != null ? `${visit.checkin_latitude.toFixed(6)}, ${visit.checkin_longitude?.toFixed(6)}` : '—'}
              </div>
            </div>
          </div>

          {visit.notes && (
            <>
              <Separator />
              <div>
                <div className="text-muted-foreground text-sm mb-1">Observações</div>
                <div className="text-sm">{visit.notes}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Foto antes</CardTitle></CardHeader>
          <CardContent>
            {visit.checkin_photo_url
              ? <img src={visit.checkin_photo_url} alt="Check-in" className="rounded-lg w-full aspect-square object-cover" />
              : <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">Sem foto</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Foto depois</CardTitle></CardHeader>
          <CardContent>
            {visit.checkout_photo_url
              ? <img src={visit.checkout_photo_url} alt="Check-out" className="rounded-lg w-full aspect-square object-cover" />
              : <div className="aspect-square rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">Sem foto</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Itens repostos</CardTitle>
        </CardHeader>
        <CardContent>
          {visit.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item registrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="pb-2">Produto</th><th className="pb-2 text-right">Reposto</th><th className="pb-2 text-right">Sugerido</th></tr>
              </thead>
              <tbody>
                {visit.items.map(it => (
                  <tr key={it.id} className="border-t">
                    <td className="py-2">{it.product?.name ?? it.product_name ?? '—'}</td>
                    <td className="py-2 text-right font-medium">{it.quantity}</td>
                    <td className="py-2 text-right text-muted-foreground">{it.suggested_quantity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
