import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

let cached: SupabaseClient | undefined;

/** Browser Supabase client (anon key) — singleton per page load. */
export function getBrowserClient(): SupabaseClient {
  if (cached) return cached;
  const { url, anonKey } = getPublicEnv();
  cached = createBrowserClient(url, anonKey);
  return cached;
}
