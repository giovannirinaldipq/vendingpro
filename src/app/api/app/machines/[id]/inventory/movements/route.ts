import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function getAuthContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
  if (!profile?.tenant_id) return null;
  return { userId: user.id, tenantId: profile.tenant_id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: machineId } = await params;
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const productId = searchParams.get('product_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  let query = supabaseAdmin
    .from('inventory_movements')
    .select('id, product_id, movement_type, quantity, occurred_at, notes, source_kind, source_ref, created_by, product:products(name)')
    .eq('machine_id', machineId)
    .eq('tenant_id', ctx.tenantId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { movements: data ?? [] } });
}
