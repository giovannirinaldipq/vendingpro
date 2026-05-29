import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { suggestProductSwaps } from '@/lib/suggestions';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Check how many distinct days of sales data exist
  const since21 = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10);
  const { data: salesDays } = await supabaseAdmin
    .from('sales')
    .select('sale_date')
    .eq('tenant_id', ctx.tenantId)
    .gte('sale_date', since21);

  const distinctDays = new Set((salesDays ?? []).map(s => s.sale_date)).size;

  if (distinctDays < 14) {
    return NextResponse.json({
      data: [],
      meta: {
        insufficient_data: true,
        days_available: distinctDays,
        days_required: 14,
        message: `Dados insuficientes para sugestões de troca. Você tem ${distinctDays} dia(s) de vendas importadas. Mínimo recomendado: 14 dias.`,
      },
    });
  }

  const data = await suggestProductSwaps(ctx.tenantId);
  return NextResponse.json({ data, meta: { insufficient_data: false, days_available: distinctDays } });
}
