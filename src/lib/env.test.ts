import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicEnv } from '@/lib/env';

describe('env access', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns parsed public env when present', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    expect(getPublicEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
  });

  it('throws a descriptive error listing the problem when URL is invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('throws when the anon key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(() => getPublicEnv()).toThrow(/anon/i);
  });
});
