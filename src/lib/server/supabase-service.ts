import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@/lib/env';

let cached: SupabaseClient | undefined;

function getServiceRoleKey(): string {
  // Optional at build time, mandatory where used — CI stays green.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length === 0) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this server-side operation.');
  }
  return key;
}

/**
 * SERVICE-ROLE Supabase client — bypasses RLS. Server-only by construction:
 *  1. `import 'server-only'` breaks any client bundle that includes it.
 *  2. ESLint `no-restricted-imports` bans `@/lib/server/*` outside server code.
 *  3. scripts/check-secrets-usage.mjs fails CI on stray references.
 * Use only where RLS cannot express the operation (e.g. signup transaction,
 * approval flow). Every use must be justified in the owning task's tests.
 */
export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const { url } = getPublicEnv();
  cached = createClient(url, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
