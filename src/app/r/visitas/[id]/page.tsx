'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Camera, CheckCircle, MapPin, Package, Save,
  AlertTriangle, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';

interface Visit {
  id: string;
  machine_id: string;
  checkin_at: string;
  checkout_at: string | null;
  checkin_photo_url: string | null;
  checkout_photo_url: string | null;
  notes: string | null;
  is_location_valid: boolean | null;
  checkin_distance_meters: number | null;
  machine: { id: string; code: string; name: string; location: { name: string } | null };
}

interface PicklistItem {
  machine_product_id: string;
  slot_code: string | null;
  product: { id: string; name: string; category: string | null; unit_size: string | null } | null;
  already_reposted: number;
  suggested_quantity: number;
  suggestion_reason?: 'capacity_based' | 'consumption' | 'capacity' | 'fallback';
  current_stock: number | null;
  max_capacity: number | null;
  fill_level: number | null;
  warehouse_stock: number | null;
  warehouse_sufficient: boolean | null;
}

interface VisitData {
  visit: Visit;
  picklist: PicklistItem[];
  items: Array<{ id: string; product_id: string; quantity: number }>;
}

export default function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<VisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<'checkin' | 'checkout' | null>(null);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoMode, setPhotoMode] = useState<'checkin' | 'checkout'>('checkin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/r/visits/${id}`);
      const j = await res.json();
      if (j.success) {
        setData(j.data);
        setNotes(j.data.visit.notes ?? '');
        // Pré-popula drafts com quantidades já reposted
        const d: Record<string, number> = {};
        for (const it of j.data.items) {
          d[it.product_id] = it.quantity;
        }
        setDrafts(d);
      } else {
        toast.error(j.error?.message ?? 'Falha ao carregar');
        router.push('/r/visitas');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function saveItem(productId: string) {
    const qty = drafts[productId] ?? 0;
    setSavingProductId(productId);
    try {
      const picklistItem = data?.picklist.find(p => p.product?.id === productId);
      const res = await fetch(`/api/r/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          product_id: productId,
          product_name: picklistItem?.product?.name,
          quantity: qty,
          suggested_quantity: picklistItem?.suggested_quantity,
        }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success('Quantidade salva');
        await load();
      } else {
        toast.error(j.error?.message ?? 'Falha ao salvar');
      }
    } finally {
      setSavingProductId(null);
    }
  }

  async function openPhotoPicker(mode: 'checkin' | 'checkout') {
    setPhotoMode(mode);
    fileInputRef.current?.click();
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permite reupload do mesmo arquivo

    setUploadingPhoto(photoMode);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/r/photo', { method: 'POST', body: fd });
      const j = await res.json();
      if (!j.success) {
        toast.error(j.error?.message ?? 'Falha no upload');
        return;
      }
      toast.success('Foto enviada');

      if (photoMode === 'checkout') {
        // Finaliza a visita imediatamente
        await finishVisit(j.data.url);
      } else {
        // Atualiza foto de check-in retroativamente (raro, mas útil)
        toast.info('Foto de check-in não é editável após o início da visita', { duration: 4000 });
      }
    } finally {
      setUploadingPhoto(null);
    }
  }

  async function finishVisit(checkoutPhotoUrl?: string) {
    setFinishing(true);
    try {
      const res = await fetch(`/api/r/visits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finish',
          checkout_photo_url: checkoutPhotoUrl,
          notes: notes.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success('Visita finalizada');
        router.push('/r/visitas');
      } else {
        toast.error(j.error?.message ?? 'Falha ao finalizar');
      }
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!data) return null;
  const { visit, picklist } = data;
  const isFinished = !!visit.checkout_at;

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/r/visitas">
          <Button variant="ghost" size="icon-sm" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Pill tone="outline" size="sm">{visit.machine.code}</Pill>
            {isFinished
              ? <Pill tone="success" size="sm" dot>Concluída</Pill>
              : <Pill tone="warning" size="sm" dot>Em andamento</Pill>}
          </div>
          <h1 className="text-lg font-bold tracking-tight mt-1 truncate">{visit.machine.name}</h1>
          {visit.machine.location?.name && (
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{visit.machine.location.name}
            </p>
          )}
        </div>
      </div>

      {/* Alert se localização inválida */}
      {visit.is_location_valid === false && (
        <div className="rounded-lg border border-warning/40 bg-warning-soft p-3 flex gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-text-secondary">
            Você estava a {visit.checkin_distance_meters}m do local cadastrado da máquina no check-in.
            Confira se a localização está correta.
          </p>
        </div>
      )}

      {/* Fotos */}
      <div className="grid grid-cols-2 gap-3">
        <PhotoSlot
          label="Antes (check-in)"
          url={visit.checkin_photo_url}
          uploading={uploadingPhoto === 'checkin'}
          onUpload={() => openPhotoPicker('checkin')}
          disabled={isFinished || !!visit.checkin_photo_url}
        />
        <PhotoSlot
          label="Depois (check-out)"
          url={visit.checkout_photo_url}
          uploading={uploadingPhoto === 'checkout'}
          onUpload={() => openPhotoPicker('checkout')}
          disabled={isFinished}
          hint={!isFinished ? 'Ao enviar, a visita é finalizada' : undefined}
        />
      </div>

      {/* Picklist */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">Produtos para repor</h2>
          <span className="ml-auto text-xs text-text-tertiary">{picklist.length} produtos</span>
        </div>

        {picklist.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-text-tertiary">
              Esta máquina não tem produtos cadastrados.
              <br />
              <span className="text-xs">Peça à empresa para cadastrar produtos antes do reabastecimento.</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {picklist.map(item => {
              const productId = item.product?.id;
              if (!productId) return null;
              const draftQty = drafts[productId];
              const currentQty = draftQty ?? item.already_reposted;
              const isDirty = draftQty !== undefined && draftQty !== item.already_reposted;

              return (
                <Card key={item.machine_product_id} className={item.already_reposted > 0 ? 'border-success/30' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      {item.slot_code && (
                        <Pill tone="navy" size="sm" className="font-mono">{item.slot_code}</Pill>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product?.name}</p>
                        <p className="text-[11px] text-text-tertiary truncate">
                          {item.product?.unit_size}
                          {item.product?.unit_size && item.product?.category && ' · '}
                          {item.product?.category}
                        </p>
                      </div>
                      {item.already_reposted > 0 && !isDirty && (
                        <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      )}
                    </div>

                    {/* Estoque e capacidade */}
                    {(item.current_stock !== null || item.max_capacity !== null) && (
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-text-tertiary">
                        {item.current_stock !== null && item.max_capacity !== null && (
                          <>
                            <span className="tabular-nums">
                              {item.current_stock}/{item.max_capacity}
                            </span>
                            <div className="h-1.5 w-12 rounded-full bg-surface-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full ${(item.fill_level ?? 0) >= 0.5 ? 'bg-emerald-500' : (item.fill_level ?? 0) >= 0.2 ? 'bg-amber-400' : 'bg-red-500'}`}
                                style={{ width: `${Math.round((item.fill_level ?? 0) * 100)}%` }}
                              />
                            </div>
                          </>
                        )}
                        {item.warehouse_sufficient === false && (
                          <span className="text-amber-600 font-medium flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />Estoque central baixo
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-md border border-border-default overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setDrafts(d => ({ ...d, [productId]: Math.max(0, currentQty - 1) }))}
                          disabled={isFinished}
                          className="h-8 w-8 flex items-center justify-center text-sm font-semibold text-text-secondary hover:bg-surface-subtle disabled:opacity-50"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={currentQty}
                          onChange={(e) => setDrafts(d => ({ ...d, [productId]: Math.max(0, Number(e.target.value)) }))}
                          disabled={isFinished}
                          className="h-8 w-14 text-center text-sm font-semibold tabular-nums border-x border-border-default bg-transparent focus:outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setDrafts(d => ({ ...d, [productId]: currentQty + 1 }))}
                          disabled={isFinished}
                          className="h-8 w-8 flex items-center justify-center text-sm font-semibold text-text-secondary hover:bg-surface-subtle disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[11px] text-text-tertiary">
                        levar: <span className="tabular-nums font-medium">{item.suggested_quantity}</span>
                        {item.suggestion_reason === 'capacity_based' && item.max_capacity !== null && item.current_stock !== null && (
                          <span className="ml-1 opacity-70">({item.max_capacity}−{item.current_stock})</span>
                        )}
                      </span>
                      {isDirty && !isFinished && (
                        <Button
                          size="sm"
                          onClick={() => saveItem(productId)}
                          disabled={savingProductId === productId}
                          className="ml-auto"
                        >
                          {savingProductId === productId
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <><Save className="mr-1 h-3 w-3" />Salvar</>}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Notas + finalizar */}
      {!isFinished && (
        <div className="space-y-3 pt-2 border-t border-border-default">
          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-xs font-medium text-text-secondary flex items-center gap-1">
              <FileText className="h-3 w-3" />Observações (opcional)
            </label>
            <Input
              id="notes"
              placeholder="Ex: máquina apresentou ruído estranho..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          <Button
            onClick={() => openPhotoPicker('checkout')}
            disabled={uploadingPhoto === 'checkout' || finishing}
            className="w-full"
            size="lg"
          >
            {uploadingPhoto === 'checkout' || finishing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploadingPhoto ? 'Enviando foto...' : 'Finalizando...'}</>
              : <><Camera className="mr-2 h-4 w-4" />Foto final e finalizar visita</>}
          </Button>
          <p className="text-[11px] text-text-tertiary text-center">
            A foto de check-out é obrigatória para finalizar
          </p>
        </div>
      )}

      {isFinished && visit.notes && (
        <div className="rounded-lg border border-border-default bg-surface-card p-3 text-sm">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-1">Observações</p>
          <p className="text-text-secondary">{visit.notes}</p>
        </div>
      )}
    </div>
  );
}

function PhotoSlot({
  label, url, uploading, onUpload, disabled, hint,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onUpload: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</p>
      <button
        type="button"
        onClick={onUpload}
        disabled={disabled || uploading}
        className="block w-full aspect-square rounded-lg border-2 border-dashed border-border-default bg-surface-subtle overflow-hidden hover:border-brand-navy hover:bg-brand-navy/5 disabled:cursor-not-allowed disabled:hover:border-border-default disabled:hover:bg-surface-subtle relative"
      >
        {url ? (
          <Image src={url} alt={label} fill className="object-cover" sizes="(max-width: 768px) 50vw, 200px" />
        ) : uploading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs mt-1">Enviando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
            <Camera className="h-6 w-6" />
            <span className="text-xs mt-1">Tirar foto</span>
          </div>
        )}
      </button>
      {hint && <p className="text-[10px] text-text-tertiary">{hint}</p>}
    </div>
  );
}
