import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { tplRestockerInvite } from '@/lib/email/restocker-invite';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';

async function getOwnerContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('users').select('tenant_id, role').eq('id', user.id).single();
  if (!profile?.tenant_id) return null;
  return { userId: user.id, tenantId: profile.tenant_id, role: profile.role };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: restockerId } = await params;
  const supabase = await createClient();
  const ctx = await getOwnerContext(supabase);
  if (!ctx) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Sessão expirada' } },
      { status: 401 }
    );
  }

  // Carrega o restocker garantindo isolamento por tenant
  const { data: restocker } = await supabaseAdmin
    .from('restockers')
    .select('id, name, email, tenant_id, user_id, is_active')
    .eq('id', restockerId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!restocker) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Reabastecedor não encontrado' } },
      { status: 404 }
    );
  }
  if (!restocker.is_active) {
    return NextResponse.json(
      { success: false, error: { code: 'INACTIVE', message: 'Reabastecedor está inativo — reative antes de convidar' } },
      { status: 400 }
    );
  }
  if (!restocker.email) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_EMAIL', message: 'Cadastre um email no reabastecedor antes de enviar o convite' } },
      { status: 400 }
    );
  }

  // Carrega nome da empresa pro email
  const { data: tenant } = await supabaseAdmin
    .from('tenants').select('company_name').eq('id', ctx.tenantId).single();
  const companyName = tenant?.company_name ?? 'Sua empresa';

  // Gera magic link via Supabase Auth admin
  // Estratégia: se já tem user_id, usa generateLink com type=magiclink; senão inviteUserByEmail
  let actionUrl: string;

  if (restocker.user_id) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: restocker.email,
      options: { redirectTo: `${APP_URL}/r/visitas` },
    });
    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { success: false, error: { code: 'LINK_FAILED', message: error?.message ?? 'Falha ao gerar link' } },
        { status: 500 }
      );
    }
    actionUrl = data.properties.action_link;
  } else {
    // Primeiro convite: cria usuário no auth.users via invite
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(restocker.email, {
      redirectTo: `${APP_URL}/r/visitas`,
      data: { restocker_id: restocker.id, role: 'restocker' },
    });
    if (error) {
      // Se já existe, cai pro fluxo de magiclink + linka manualmente
      if (error.message?.toLowerCase().includes('already')) {
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: restocker.email,
          options: { redirectTo: `${APP_URL}/r/visitas` },
        });
        if (linkErr || !linkData?.properties?.action_link) {
          return NextResponse.json(
            { success: false, error: { code: 'LINK_FAILED', message: linkErr?.message ?? 'Falha ao gerar link' } },
            { status: 500 }
          );
        }
        actionUrl = linkData.properties.action_link;
        if (linkData.user?.id) {
          await supabaseAdmin
            .from('restockers')
            .update({ user_id: linkData.user.id })
            .eq('id', restocker.id);
        }
      } else {
        return NextResponse.json(
          { success: false, error: { code: 'INVITE_FAILED', message: error.message } },
          { status: 500 }
        );
      }
    } else if (data?.user?.id) {
      // Linka o user recém-criado ao restocker
      await supabaseAdmin
        .from('restockers')
        .update({ user_id: data.user.id })
        .eq('id', restocker.id);

      // O invite já manda o email automaticamente, mas como queremos um template
      // próprio com branding VendingPro, vamos gerar um magic link separado também
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: restocker.email,
        options: { redirectTo: `${APP_URL}/r/visitas` },
      });
      actionUrl = linkData?.properties?.action_link ?? `${APP_URL}/login`;
    } else {
      actionUrl = `${APP_URL}/login`;
    }
  }

  // Envia email com template branded
  const { subject, html } = tplRestockerInvite({
    restockerName: restocker.name,
    companyName,
    acceptUrl: actionUrl,
  });

  const result = await sendEmail({
    to: restocker.email,
    subject,
    html,
    tags: [
      { name: 'type', value: 'restocker_invite' },
      { name: 'restocker_id', value: restocker.id },
    ],
  });

  // Marca data do envio
  await supabaseAdmin
    .from('restockers')
    .update({ invite_sent_at: new Date().toISOString() })
    .eq('id', restocker.id);

  return NextResponse.json({
    success: true,
    data: {
      email_sent: result.ok,
      email_skipped: result.skipped ?? false,
      message: result.ok
        ? `Convite enviado para ${restocker.email}`
        : (result.skipped
          ? 'Email não enviado (Resend não configurado) — copie o link manualmente'
          : `Falha ao enviar email: ${result.error}`),
      // Em dev / quando email não vai, devolve o link pra admin copiar manualmente
      action_url: !result.ok ? actionUrl : undefined,
    },
  });
}
