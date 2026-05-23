import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userProfile } = await supabase
    .from('users')
    .select('tenant_id, id')
    .eq('id', user.id)
    .single();

  return userProfile || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const userProfile = await getTenantId(supabase);
  if (!userProfile?.tenant_id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('alerts')
    .select(`
      *,
      machine:machines(id, code, name, location:locations(name)),
      acknowledged_by_user:users!alerts_acknowledged_by_fkey(name)
    `)
    .eq('id', id)
    .eq('tenant_id', userProfile.tenant_id)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Alerta não encontrado' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const userProfile = await getTenantId(supabase);
  if (!userProfile?.tenant_id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const { action } = body;
  const updateData: Record<string, unknown> = {};

  if (action === 'acknowledge') {
    updateData.status = 'acknowledged';
    updateData.acknowledged_at = new Date().toISOString();
    updateData.acknowledged_by = userProfile.id;
  } else if (action === 'resolve') {
    updateData.status = 'resolved';
    updateData.resolved_at = new Date().toISOString();
  } else if (action === 'dismiss') {
    updateData.status = 'dismissed';
  } else if (body.status) {
    updateData.status = body.status;
  }

  const { data, error } = await supabase
    .from('alerts')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', userProfile.tenant_id)
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

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const userProfile = await getTenantId(supabase);
  if (!userProfile?.tenant_id) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id)
    .eq('tenant_id', userProfile.tenant_id);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
