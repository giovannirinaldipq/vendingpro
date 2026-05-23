import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return userProfile?.tenant_id || null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'active';
  const severity = searchParams.get('severity');
  const machineId = searchParams.get('machine_id');

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json({
      success: true,
      data: { alerts: [], total: 0, stats: {} },
    });
  }

  let query = supabase
    .from('alerts')
    .select(`
      *,
      machine:machines(id, code, name)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (severity) {
    query = query.eq('severity', severity);
  }

  if (machineId) {
    query = query.eq('machine_id', machineId);
  }

  const { data, error, count } = await query.limit(100);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  // Calcular estatísticas
  const { data: allAlerts } = await supabase
    .from('alerts')
    .select('status, severity')
    .eq('tenant_id', tenantId);

  const stats = {
    total: (allAlerts || []).length,
    active: (allAlerts || []).filter(a => a.status === 'active').length,
    critical: (allAlerts || []).filter(a => a.severity === 'critical' && a.status === 'active').length,
    high: (allAlerts || []).filter(a => a.severity === 'high' && a.status === 'active').length,
    medium: (allAlerts || []).filter(a => a.severity === 'medium' && a.status === 'active').length,
    low: (allAlerts || []).filter(a => a.severity === 'low' && a.status === 'active').length,
  };

  return NextResponse.json({
    success: true,
    data: {
      alerts: data || [],
      total: count || 0,
      stats,
    },
  });
}

// Criar alerta manualmente (para testes ou alertas customizados)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const tenantId = await getTenantId(supabase);
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TENANT', message: 'Usuário não vinculado a uma empresa' } },
      { status: 403 }
    );
  }

  const { machine_id, alert_type, severity, title, message, data: alertData } = body;

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      tenant_id: tenantId,
      machine_id: machine_id || null,
      alert_type: alert_type || 'other',
      severity: severity || 'medium',
      title,
      message,
      data: alertData || null,
      status: 'active',
    })
    .select(`
      *,
      machine:machines(id, code, name)
    `)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
