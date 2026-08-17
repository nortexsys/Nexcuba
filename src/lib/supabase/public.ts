import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

let cached: SupabaseClient | undefined;

/**
 * Plain ANON client for server-rendered public pages — no cookies, so routes
 * can stay dynamic without a session and RLS applies as the anonymous role
 * (only approved companies / public content are visible).
 */
export function getPublicClient(): SupabaseClient {
  if (cached) return cached;
  const { url, anonKey } = getPublicEnv();
  cached = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
