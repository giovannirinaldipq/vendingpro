import { supabaseAdmin } from '@/lib/supabase/admin';

const BUCKET = 'entity-photos';

export type EntityKind = 'machine' | 'location';

export async function createEntityPhotoUploadUrl(
  tenantId: string,
  kind: EntityKind,
  entityId: string
): Promise<{ uploadUrl: string; publicUrl: string; path: string; token: string }> {
  const filename = `${Date.now()}.jpg`;
  const path = `${tenantId}/${kind}/${entityId}/${filename}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(`Falha signed URL: ${error?.message}`);

  const { data: pubData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return {
    uploadUrl: data.signedUrl,
    publicUrl: pubData.publicUrl,
    path: data.path,
    token: data.token,
  };
}
