import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { IMPERSONATION_SESSION_COOKIE } from '@/lib/admin/impersonate';
import { TWO_FA_COOKIE, verifyTwoFaCookie } from '@/lib/auth/2fa-cookie';

// Client dedicado pro middleware — evita problemas com o Proxy lazy + .schema()
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Retorna true se o user tem 2FA WhatsApp verificado e não passou o desafio nessa sessão. */
async function isTwoFaRequired(request: NextRequest, userId: string): Promise<boolean> {
  const cookieVal = request.cookies.get(TWO_FA_COOKIE)?.value;
  if (cookieVal && (await verifyTwoFaCookie(cookieVal)) === userId) return false;

  const { data } = await supabaseAdmin
    .from('user_whatsapp_2fa')
    .select('is_verified')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.is_verified;
}

async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('admin_users_lookup')
    .select('id')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

async function isImpersonatingActive(sessionId: string, adminUserId: string): Promise<boolean> {
  const { data } = await getAdminClient()
    .schema('admin')
    .from('impersonation_sessions')
    .select('id, ended_at, expires_at')
    .eq('id', sessionId)
    .eq('admin_user_id', adminUserId)
    .maybeSingle();
  if (!data || data.ended_at) return false;
  return new Date(data.expires_at) > new Date();
}

async function isRestockerUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('restockers')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/conta-suspensa',
  ];
  const isPublicRoute =
    publicRoutes.some(r => pathname === r) ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/whoami') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  // Rotas envolvidas no fluxo de 2FA — não enforce loop infinito
  const isTwoFaFlow =
    pathname === '/2fa-challenge' ||
    pathname.startsWith('/api/auth/2fa');

  // Não logado tentando rota privada → /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 2FA enforcement: usuário logado + 2FA ativo + cookie ausente → /2fa-challenge
  if (user && !isPublicRoute && !isTwoFaFlow) {
    if (await isTwoFaRequired(request, user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = '/2fa-challenge';
      url.search = '';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Logado acessando /login, /register ou raiz → manda pra rota apropriada
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    const [admin, restocker] = await Promise.all([
      isAdminUser(user.id),
      isRestockerUser(user.id),
    ]);
    const url = request.nextUrl.clone();
    url.pathname = admin ? '/admin' : restocker ? '/r/visitas' : '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Cliente comum tentando /admin/* → redireciona pra /app
  if (user && pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    const admin = await isAdminUser(user.id);
    if (!admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }
  }

  // Admin tentando /app/* → redireciona pra /admin, A MENOS que haja sessão de impersonação ativa
  if (user && pathname.startsWith('/app') && !pathname.startsWith('/api/')) {
    const admin = await isAdminUser(user.id);
    if (admin) {
      const sessionId = request.cookies.get(IMPERSONATION_SESSION_COOKIE)?.value;
      const impersonating = sessionId ? await isImpersonatingActive(sessionId, user.id) : false;
      if (!impersonating) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    }
  }

  // Reabastecedor tentando /app/* → redireciona pra /r/visitas
  // (exceto se também for admin — admin prevalece)
  // Nota: não checa /admin/* aqui porque o bloco acima já garante que só admin acessa /admin
  if (user && pathname.startsWith('/app') && !pathname.startsWith('/api/')) {
    const [restocker, admin] = await Promise.all([
      isRestockerUser(user.id),
      isAdminUser(user.id),
    ]);
    if (restocker && !admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/r/visitas';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Acesso a /r/* exige ser reabastecedor (e nada mais)
  if (user && pathname.startsWith('/r/') && !pathname.startsWith('/api/')) {
    const restocker = await isRestockerUser(user.id);
    if (!restocker) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }
  }

  // Bloqueio por status do tenant — apenas /app/*
  if (user && pathname.startsWith('/app')) {
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('subscription_status')
        .eq('id', profile.tenant_id)
        .maybeSingle();

      const blockedStatuses = ['suspended', 'cancelled'];
      if (tenant && blockedStatuses.includes(tenant.subscription_status)) {
        const url = request.nextUrl.clone();
        url.pathname = '/conta-suspensa';
        url.searchParams.set('status', tenant.subscription_status);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
