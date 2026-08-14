import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getPublicEnv } from '@/lib/env';

/**
 * Server Supabase client for Server Components / Server Actions / Route
 * Handlers. Uses the caller's cookies, so RLS applies with the user's JWT.
 */
export async function getServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: middleware refreshes sessions.
        }
      },
    },
  });
}
