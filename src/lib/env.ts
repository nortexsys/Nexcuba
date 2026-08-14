import { z } from 'zod';

/**
 * Public (browser-safe) environment access — lazily validated so builds and
 * CI without secrets still work. Missing vars produce explicit, actionable
 * errors at first use. Privileged keys are read only inside src/lib/server.
 */
const publicEnvSchema = z.object({
  url: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  anonKey: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

export interface PublicEnv {
  url: string;
  anonKey: string;
}

export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Supabase environment invalid: ${issues}. Copy .env.example to .env.local.`);
  }
  return parsed.data;
}
