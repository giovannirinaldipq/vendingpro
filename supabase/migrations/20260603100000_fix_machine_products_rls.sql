-- Fix: machine_products usava auth.jwt() ->> 'tenant_id' que não existe no JWT
-- dos users normais (só admin). Resultado: cadastrar produto na máquina dava erro
-- silencioso. Corrige pra usar current_tenant_id() como o resto do schema.

DROP POLICY IF EXISTS machine_products_tenant_isolation ON public.machine_products;

CREATE POLICY tenant_isolation
  ON public.machine_products
  FOR ALL
  USING (tenant_id = current_tenant_id() OR is_admin_user())
  WITH CHECK (tenant_id = current_tenant_id() OR is_admin_user());
