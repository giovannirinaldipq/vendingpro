import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase admin client: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY ausentes. ' +
      'Configure no .env.local (dev) ou Project Settings → Environment Variables (Vercel/prod).'
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

/**
 * Cliente Supabase com service-role key, criado preguiçosamente.
 *
 * Use SOMENTE em código de servidor (route handlers, server actions,
 * server components, middleware). NUNCA exponha em client components.
 *
 * O Proxy difere a instanciação até o primeiro uso real (.from, .auth, etc),
 * o que permite que builds do Next.js (page-data collection, server-only
 * module evaluation) não crashem por env vars ausentes durante CI.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
