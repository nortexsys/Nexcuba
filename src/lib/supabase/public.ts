import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

let cached: SupabaseClient | undefined;

/**
 * Plain ANON client for server-rendered public pages — no cookies, so routes
 * can stay dynamic without a session and RLS applies as the anonymous role
 * (only approved companies / public content are visible).
 *
 * Without a Supabase config (CI or a local build without .env.local) it does
 * NOT throw: it returns a client pointed at a dead address so every query
 * fails fast (ECONNREFUSED) and safeQuery degrades to its fallback. This lets
 * static prerendering (ISR routes) and the sitemap build with no env at all.
 */
export function getPublicClient(): SupabaseClient {
  if (cached) return cached;

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getPublicEnv());
  } catch {
    url = 'http://127.0.0.1:9';
    anonKey = 'anon';
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
