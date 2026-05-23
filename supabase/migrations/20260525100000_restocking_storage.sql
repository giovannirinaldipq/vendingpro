-- Sprint 3: Reabastecedor — storage para fotos + colunas que faltavam em visits/items

-- Bucket público para fotos de check-in/out (5MB por arquivo, só imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'restocking-photos',
  'restocking-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policies: qualquer authenticated pode escrever (server vai gatear via signed URLs),
-- leitura pública (URL é difícil de adivinhar)
DO $$ BEGIN
  CREATE POLICY "restocking_photos_auth_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'restocking-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "restocking_photos_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'restocking-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Garantir colunas que podem estar faltando em restocking_items
ALTER TABLE public.restocking_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Backfill tenant_id em items a partir do visit
UPDATE public.restocking_items i
SET tenant_id = v.tenant_id
FROM public.restocking_visits v
WHERE i.visit_id = v.id AND i.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_restocking_visits_tenant_date
  ON public.restocking_visits(tenant_id, checkin_at DESC);

CREATE INDEX IF NOT EXISTS idx_restocking_visits_machine
  ON public.restocking_visits(machine_id);

CREATE INDEX IF NOT EXISTS idx_restocking_items_visit
  ON public.restocking_items(visit_id);

-- Raio padrão para validação de check-in (100m), configurável depois
COMMENT ON COLUMN public.restocking_visits.checkin_distance_meters IS
  'Distância calculada entre coordenadas do check-in e do local da máquina (haversine). Visita é marcada is_location_valid=false se > 100m.';
