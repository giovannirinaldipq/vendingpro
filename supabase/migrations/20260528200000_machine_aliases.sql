-- Aliases para mapear nomes externos (do VM PAY / VendPago) para machine_id.
-- Eliminam a necessidade de o cliente memorizar nomes técnicos.

CREATE TABLE IF NOT EXISTS public.machine_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  external_name VARCHAR(500) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('vmpay', 'vendpago')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),

  -- Mesma planilha-externa não pode mapear pra 2 máquinas diferentes do mesmo tenant
  UNIQUE (tenant_id, source, external_name)
);

CREATE INDEX IF NOT EXISTS idx_machine_aliases_lookup
  ON public.machine_aliases(tenant_id, source, external_name);

CREATE INDEX IF NOT EXISTS idx_machine_aliases_machine
  ON public.machine_aliases(machine_id);

-- RLS — tenant isolation (mesmo padrão do S2)
ALTER TABLE public.machine_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.machine_aliases;
CREATE POLICY tenant_isolation ON public.machine_aliases FOR ALL
  USING (tenant_id = public.current_tenant_id() OR public.is_admin_user())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin_user());
