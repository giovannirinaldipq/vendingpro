import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateTenantSchema } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*, plan:billing.plans(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Cliente não encontrado' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
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

  const validation = updateTenantSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error.issues[0].message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Soft delete - apenas marca como cancelado
  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { message: 'Cliente cancelado com sucesso' } });
}
