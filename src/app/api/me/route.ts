/**
 * GET /api/me — retorna dados do usuário logado pra UI
 * (nome, email, role, tenant_id) sem expor RLS direto.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  // Tenta user da tabela public.users (cliente comum)
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, tenant_id, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    return NextResponse.json({
      success: true,
      data: {
        kind: 'tenant_user',
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        tenant_id: profile.tenant_id,
        avatar_url: profile.avatar_url,
      },
    });
  }

  // Tenta admin
  const { data: adminProfile } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .select('id, name, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (adminProfile) {
    return NextResponse.json({
      success: true,
      data: {
        kind: 'admin',
        id: adminProfile.id,
        name: adminProfile.name,
        email: adminProfile.email,
        role: adminProfile.role,
      },
    });
  }

  // Reabastecedor
  const { data: restocker } = await supabaseAdmin
    .from('restockers')
    .select('id, name, email, tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (restocker) {
    return NextResponse.json({
      success: true,
      data: {
        kind: 'restocker',
        id: restocker.id,
        name: restocker.name,
        email: restocker.email,
        tenant_id: restocker.tenant_id,
      },
    });
  }

  // Sessão válida mas sem profile linkado
  return NextResponse.json({
    success: true,
    data: {
      kind: 'unknown',
      id: user.id,
      name: user.email?.split('@')[0] ?? 'Usuário',
      email: user.email,
    },
  });
}
