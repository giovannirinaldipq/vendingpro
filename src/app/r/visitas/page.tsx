'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin, ClipboardCheck, Loader2, Play, CheckCircle, Clock, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';

interface Machine {
  id: string;
  code: string;
  name: string;
  location: { id: string; name: string; address_street: string | null; address_city: string | null; latitude: number | null; longitude: number | null } | null;
  status: 'pending' | 'in_progress' | 'done';
  today_visit: { id: string; checkin_at: string; checkout_at: string | null } | null;
}

interface Summary { total: number; pending: number; in_progress: number; done: number; }

export default function VisitasPage() {
  const router = useRouter();
  const [data, setData] = useState<{ machines: Machine[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/r/visits');
      const j = await res.json();
      if (j.success) setData(j.data);
      else toast.error(j.error?.message ?? 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function getPosition(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function startVisit(machineId: string) {
    setStartingId(machineId);
    try {
      const pos = await getPosition();
      const res = await fetch('/api/r/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId,
          latitude: pos?.lat ?? null,
          longitude: pos?.lng ?? null,
        }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success('Visita iniciada');
        router.push(`/r/visitas/${j.data.id}`);
      } else {
        toast.error(j.error?.message ?? 'Falha ao iniciar visita');
      }
    } finally {
      setStartingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!data || data.machines.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardCheck className="mx-auto h-12 w-12 text-text-tertiary/50" />
        <h1 className="mt-4 text-lg font-semibold text-text-primary">Nenhuma máquina atribuída</h1>
        <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
          Você ainda não tem máquinas atribuídas a você. Peça à empresa pra te atribuir as máquinas no painel.
        </p>
      </div>
    );
  }

  const { summary, machines } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minhas visitas hoje</h1>
        <p className="text-sm text-text-secondary mt-1">
          {summary.done} de {summary.total} concluídas
          {summary.in_progress > 0 && ` · ${summary.in_progress} em andamento`}
        </p>
      </div>

      {/* Progress bar simples */}
      <div className="h-2 rounded-full bg-surface-subtle overflow-hidden">
        <div
          className="h-full bg-success transition-all duration-500"
          style={{ width: `${summary.total === 0 ? 0 : (summary.done / summary.total) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {machines.map(m => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill tone="outline" size="sm">{m.code}</Pill>
                    <StatusPill status={m.status} />
                  </div>
                  <h3 className="font-semibold text-text-primary">{m.name}</h3>
                  {m.location && (
                    <div className="mt-1 flex items-start gap-1 text-xs text-text-secondary">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        {m.location.name}
                        {m.location.address_street && ` — ${m.location.address_street}`}
                        {m.location.address_city && `, ${m.location.address_city}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {m.status === 'pending' && (
                    <Button
                      onClick={() => startVisit(m.id)}
                      disabled={startingId === m.id}
                      size="sm"
                    >
                      {startingId === m.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Play className="mr-1 h-3 w-3" />Iniciar</>}
                    </Button>
                  )}
                  {m.status === 'in_progress' && m.today_visit && (
                    <Link href={`/r/visitas/${m.today_visit.id}`}>
                      <Button size="sm" variant="outline">
                        <Camera className="mr-1 h-3 w-3" />Continuar
                      </Button>
                    </Link>
                  )}
                  {m.status === 'done' && m.today_visit && (
                    <Link href={`/r/visitas/${m.today_visit.id}`}>
                      <Button size="sm" variant="ghost">
                        <CheckCircle className="mr-1 h-3 w-3 text-success" />Ver
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: 'pending' | 'in_progress' | 'done' }) {
  if (status === 'done') return <Pill tone="success" size="sm" dot>Concluída</Pill>;
  if (status === 'in_progress') return <Pill tone="warning" size="sm" dot><Clock className="h-3 w-3" />Em andamento</Pill>;
  return <Pill tone="neutral" size="sm">Pendente</Pill>;
}
