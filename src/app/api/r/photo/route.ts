/**
 * Upload de foto para o bucket "restocking-photos".
 * Recebe FormData com `file` (image/*), retorna URL pública.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRestockerContext, restockerSupabaseAdmin } from '@/lib/auth/restocker';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const ctx = await getRestockerContext();
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão inválida' } },
      { status: 401 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_FILE', message: 'Arquivo não enviado' } },
      { status: 400 }
    );
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TYPE', message: 'Use JPEG, PNG ou WebP' } },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_LARGE', message: 'Foto até 5MB' } },
      { status: 400 }
    );
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `${ctx.tenantId}/${ctx.restockerId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const arr = await file.arrayBuffer();
  const { error: upErr } = await restockerSupabaseAdmin.storage
    .from('restocking-photos')
    .upload(path, new Uint8Array(arr), {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: upErr.message } },
      { status: 500 }
    );
  }

  const { data: pub } = restockerSupabaseAdmin.storage
    .from('restocking-photos')
    .getPublicUrl(path);

  return NextResponse.json({ success: true, data: { url: pub.publicUrl, path } });
}
