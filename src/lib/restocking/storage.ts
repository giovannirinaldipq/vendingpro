import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'restocking-photos';

export interface SignedUploadUrl {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  token: string;
}

/**
 * Gera signed URL para upload direto (cliente → Supabase Storage), bypassing nossa API.
 * Retorna também a URL pública final (bucket é public read).
 */
export async function createSignedUploadUrl(
  tenantId: string,
  visitId: string,
  kind: 'checkin' | 'checkout'
): Promise<SignedUploadUrl> {
  const filename = `${kind}-${Date.now()}.jpg`;
  const path = `${tenantId}/${visitId}/${filename}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Falha ao criar signed URL: ${error?.message}`);
  }

  const { data: pubData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return {
    uploadUrl: data.signedUrl,
    publicUrl: pubData.publicUrl,
    path: data.path,
    token: data.token,
  };
}
