import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .schema('admin')
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
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

  // Não logado tentando rota privada → /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
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

  // Admin tentando /app/* → redireciona pra /admin (admin não tem tenant; ver /admin/clientes/<id>/imitar pra impersonar)
  if (user && pathname.startsWith('/app') && !pathname.startsWith('/api/')) {
    const admin = await isAdminUser(user.id);
    if (admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  // Reabastecedor tentando /app/* ou /admin/* → redireciona pra /r/visitas
  if (user && (pathname.startsWith('/app') || pathname.startsWith('/admin'))) {
    if (!pathname.startsWith('/api/')) {
      const restocker = await isRestockerUser(user.id);
      if (restocker) {
        const url = request.nextUrl.clone();
        url.pathname = '/r/visitas';
        url.search = '';
        return NextResponse.redirect(url);
      }
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
