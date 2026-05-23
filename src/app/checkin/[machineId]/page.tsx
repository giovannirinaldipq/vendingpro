'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, MapPin, Camera, CheckCircle2, Package, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Suggestion {
  product_id: string;
  product_name: string;
  total_sold_last_7d: number;
  avg_per_day: number;
  suggested_quantity: number;
}

interface Machine {
  id: string;
  name: string;
  code: string;
  location?: { name: string; latitude?: number; longitude?: number } | null;
}

type Step = 'gps' | 'checkin' | 'restock' | 'checkout' | 'done';

export default function CheckinMobilePage() {
  const { machineId } = useParams<{ machineId: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>('gps');
  const [machine, setMachine] = useState<Machine | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [checkinPhoto, setCheckinPhoto] = useState<string | null>(null);
  const [checkoutPhoto, setCheckoutPhoto] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/app/machines/${machineId}`)
      .then(r => r.json())
      .then(j => setMachine(j.data ?? j.machine ?? null));
    fetch(`/api/app/machines/${machineId}/suggestions`)
      .then(r => r.json())
      .then(j => {
        setSuggestions(j.data ?? []);
        setQuantities(Object.fromEntries((j.data ?? []).map((s: Suggestion) => [s.product_id, s.suggested_quantity])));
      });
    requestGps();
  }, [machineId]);

  function requestGps() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('GPS não disponível neste navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => setGpsError(`Erro GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function uploadPhotoFor(visit: string, kind: 'checkin' | 'checkout', file: File): Promise<string | null> {
    const { data, error: urlErr } = await fetch('/api/app/upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_id: visit, kind }),
    }).then(r => r.json().then(j => ({ data: j.data, error: j.error })));
    if (urlErr || !data) {
      toast.error(urlErr ?? 'Falha ao gerar URL de upload');
      return null;
    }
    const up = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type, 'x-upsert': 'true' },
      body: file,
    });
    if (!up.ok) {
      toast.error('Falha ao subir foto');
      return null;
    }
    return data.publicUrl;
  }

  async function doCheckin(file: File | null) {
    if (!coords) return toast.error('Pegue o GPS antes');
    setBusy(true);
    try {
      // 1) Cria a visit primeiro (sem foto)
      const res = await fetch('/api/app/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId,
          latitude: coords.lat,
          longitude: coords.lng,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Falha ao criar visita');
        return;
      }
      const newVisitId = json.data.id;
      setVisitId(newVisitId);

      if (json.data.is_location_valid === false) {
        toast.warning(`Você está a ${json.data.distance_meters}m do local. Visita registrada como atípica.`);
      }

      // 2) Upload de foto (opcional)
      if (file) {
        const url = await uploadPhotoFor(newVisitId, 'checkin', file);
        if (url) {
          setCheckinPhoto(url);
          await fetch(`/api/app/visits/${newVisitId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkin_photo_url: url }),
          });
        }
      }

      setStep('restock');
    } finally {
      setBusy(false);
    }
  }

  async function doCheckout(file: File | null) {
    if (!visitId) return;
    setBusy(true);
    try {
      let photoUrl: string | null = null;
      if (file) photoUrl = await uploadPhotoFor(visitId, 'checkout', file);
      if (photoUrl) setCheckoutPhoto(photoUrl);

      const items = Object.entries(quantities)
        .filter(([_, q]) => q > 0)
        .map(([product_id, quantity]) => {
          const sug = suggestions.find(s => s.product_id === product_id);
          return {
            product_id,
            product_name: sug?.product_name,
            quantity,
            suggested_quantity: sug?.suggested_quantity,
          };
        });

      const res = await fetch(`/api/app/visits/${visitId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: photoUrl, notes: notes || undefined, items }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Visita finalizada');
        setStep('done');
      } else {
        toast.error(json.error ?? 'Falha ao fechar visita');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {machine ? machine.name : 'Carregando...'}
          </CardTitle>
          <CardDescription>
            {machine?.location?.name ?? machine?.code}
            <div className="mt-2 flex gap-1 flex-wrap">
              <StepBadge active={step === 'gps'} done={!!coords}>GPS</StepBadge>
              <StepBadge active={step === 'checkin'} done={!!visitId}>Check-in</StepBadge>
              <StepBadge active={step === 'restock'} done={step === 'checkout' || step === 'done'}>Reposição</StepBadge>
              <StepBadge active={step === 'checkout'} done={step === 'done'}>Check-out</StepBadge>
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 'gps' && (
            <>
              {coords ? (
                <div className="rounded border p-3 text-sm">
                  <div className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Localização atual</div>
                  <div className="font-mono text-xs">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</div>
                </div>
              ) : gpsError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{gpsError}</div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />Aguardando GPS...
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={requestGps} variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />Atualizar GPS
                </Button>
                <Button onClick={() => setStep('checkin')} disabled={!coords} className="flex-1">
                  Continuar<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 'checkin' && (
            <>
              <p className="text-sm text-muted-foreground">Tire uma foto do estado atual da máquina (antes de abastecer).</p>
              <Label htmlFor="photo-in" className="block">
                <div className="rounded border-2 border-dashed border-muted-foreground/30 p-6 flex flex-col items-center justify-center text-sm cursor-pointer hover:bg-muted/50">
                  <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                  <span className="font-medium">Tirar foto</span>
                  <span className="text-xs text-muted-foreground">ou pular esta etapa</span>
                </div>
              </Label>
              <input
                id="photo-in"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => doCheckin(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              <Button onClick={() => doCheckin(null)} disabled={busy} variant="outline" className="w-full">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando</> : 'Pular foto e fazer check-in'}
              </Button>
            </>
          )}

          {step === 'restock' && (
            <>
              <h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" />Reposição</h3>
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem histórico de vendas para sugerir reposição.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto">
                  {suggestions.map(s => (
                    <div key={s.product_id} className="flex items-center gap-3 p-2 rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{s.product_name}</div>
                        <div className="text-xs text-muted-foreground">{s.avg_per_day}/dia · vendeu {s.total_sold_last_7d} em 7d</div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={quantities[s.product_id] ?? 0}
                        onChange={e => setQuantities(q => ({ ...q, [s.product_id]: Math.max(0, Number(e.target.value)) }))}
                        className="w-20 text-center"
                      />
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={() => setStep('checkout')} className="w-full">
                Continuar para check-out<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'checkout' && (
            <>
              <p className="text-sm text-muted-foreground">Tire uma foto do estado final (depois de abastecer) e finalize.</p>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Input id="notes" placeholder="Algum problema? Alguma observação?" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <Label htmlFor="photo-out" className="block">
                <div className="rounded border-2 border-dashed border-muted-foreground/30 p-6 flex flex-col items-center justify-center text-sm cursor-pointer hover:bg-muted/50">
                  <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                  <span className="font-medium">Tirar foto e finalizar</span>
                </div>
              </Label>
              <input
                id="photo-out"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => doCheckout(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              <Button onClick={() => doCheckout(null)} disabled={busy} variant="outline" className="w-full">
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizando</> : 'Finalizar sem foto'}
              </Button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold">Visita finalizada!</h3>
              <p className="text-sm text-muted-foreground">Boa! Os dados ficaram registrados.</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/app/visitas')} className="w-full">Ver visitas</Button>
                <Button onClick={() => router.push('/app/maquinas')} variant="outline" className="w-full">Outra máquina</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepBadge({ active, done, children }: { active: boolean; done?: boolean; children: React.ReactNode }) {
  const cls = done
    ? 'bg-green-100 text-green-700'
    : active
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-500';
  return <Badge className={cls}>{children}</Badge>;
}
