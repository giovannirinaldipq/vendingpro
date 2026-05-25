'use client';

import { useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  kind: 'machine' | 'location';
  entityId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

export function PhotoUpload({ kind, entityId, currentUrl, onUploaded, onRemoved }: Props) {
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    setBusy(true);
    try {
      const res = await fetch('/api/app/entity-photo-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, entity_id: entityId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Falha ao gerar URL');
        return;
      }
      const up = await fetch(json.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file,
      });
      if (!up.ok) {
        toast.error('Falha no upload');
        return;
      }
      onUploaded(json.data.publicUrl);
      toast.success('Foto atualizada');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="relative inline-block">
          <img src={currentUrl} alt="foto" className="w-40 h-40 object-cover rounded-lg border" />
          {onRemoved && (
            <button
              type="button"
              onClick={onRemoved}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 border shadow"
              aria-label="Remover foto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : null}
      <div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id={`upload-${entityId}`}
          className="hidden"
          onChange={e => e.target.files?.[0] && handle(e.target.files[0])}
          disabled={busy}
        />
        <Button type="button" variant="outline" disabled={busy} onClick={() => document.getElementById(`upload-${entityId}`)?.click()}>
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando</> : <><Camera className="mr-2 h-4 w-4" />{currentUrl ? 'Trocar foto' : 'Adicionar foto'}</>}
        </Button>
      </div>
    </div>
  );
}
