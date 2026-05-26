/**
 * POST /api/admin/inventory/backfill
 * Body: { tenant_id?: string }  (omitido = todos os tenants ativos)
 *
 * Para cada inventory existente sem movements, gera 1 movement
 * 'initial' com quantity = current_quantity e occurred_at = last_updated_at.
 *
 * Idempotente: skipa produtos que JÁ têm pelo menos 1 movement.
 *
 * Uso típico: rodar 1× após aplicar a migration de movements
 * pra ter o cutoff inicial e proteger contra import retroativo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { recordInitialStock } from '@/lib/inventory/movements';
import { logAudit, extractRequestMeta } from '@/lib/admin/audit';

const schema = z.object({
  tenant_id: z.string().uuid().optional(),
  dry_run: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(['super_admin']);
  if (!auth.ok) return NextResponse.json({ success: false, error: { code: auth.error, message: auth.error } }, { status: auth.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { tenant_id, dry_run } = parsed.data;

  // 1) Pega todos os inventory rows (filtrado por tenant se especificado)
  let invQuery = supabaseAdmin
    .from('inventory')
    .select('id, tenant_id, product_id, current_quantity, last_updated_at');
  if (tenant_id) invQuery = invQuery.eq('tenant_id', tenant_id);

  const { data: inventories, error: invErr } = await invQuery;
  if (invErr) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: invErr.message } }, { status: 500 });
  }

  if (!inventories || inventories.length === 0) {
    return NextResponse.json({
      success: true,
      data: { scanned: 0, skipped: 0, initialized: 0, dry_run },
    });
  }

  // 2) Pega TODOS os product_ids que já têm pelo menos 1 movement (qualquer tenant)
  // Otimização: 1 query batch em vez de N queries
  const productIds = [...new Set(inventories.map(i => i.product_id))];
  const { data: existingMovements } = await supabaseAdmin
    .from('inventory_movements')
    .select('tenant_id, product_id')
    .in('product_id', productIds);

  const haveMovementsSet = new Set<string>();
  for (const m of (existingMovements ?? []) as Array<{ tenant_id: string; product_id: string }>) {
    haveMovementsSet.add(`${m.tenant_id}::${m.product_id}`);
  }

  const candidates = inventories.filter(
    inv => !haveMovementsSet.has(`${inv.tenant_id}::${inv.product_id}`),
  );

  let initialized = 0;
  const errors: string[] = [];

  if (!dry_run) {
    for (const inv of candidates) {
      const occurredAt = inv.last_updated_at ?? new Date().toISOString();
      const result = await recordInitialStock(
        inv.tenant_id,
        inv.product_id,
        Number(inv.current_quantity) || 0,
        occurredAt,
      );
      if (result.error) {
        errors.push(`tenant=${inv.tenant_id} product=${inv.product_id}: ${result.error}`);
      } else {
        initialized++;
      }
    }
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    adminUserId: auth.admin.id,
    action: 'inventory.backfill',
    entityType: 'public.inventory',
    newValues: {
      tenant_id_filter: tenant_id ?? 'all',
      scanned: inventories.length,
      skipped: inventories.length - candidates.length,
      initialized: dry_run ? 0 : initialized,
      dry_run,
    },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({
    success: true,
    data: {
      scanned: inventories.length,
      skipped: inventories.length - candidates.length,
      initialized: dry_run ? candidates.length : initialized,
      dry_run,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}
