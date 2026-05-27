-- Add unique constraint on sales for upsert deduplication
-- Without this, the import upsert fails silently (no ON CONFLICT target)

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_dedup
  ON public.sales (tenant_id, machine_id, sale_datetime, product_name);
