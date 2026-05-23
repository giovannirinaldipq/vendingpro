import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // IMPORTANT: não inserir lógica entre createServerClient e getUser()
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
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Bloqueio por status do tenant — apenas para /app/*
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
