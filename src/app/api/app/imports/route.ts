import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('imports')
    .select('id, file_name, source_system, status, total_rows, processed_rows, completed_at')
    .eq('tenant_id', ctx.tenantId)
    .order('completed_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ data: data ?? [] });
}
