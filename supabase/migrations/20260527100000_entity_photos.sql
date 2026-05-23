-- S6: bucket genérico para fotos de máquinas e locais

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entity-photos',
  'entity-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "entity_photos_auth_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'entity-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "entity_photos_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'entity-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- locations já tem latitude/longitude no schema base; sem alteração necessária
