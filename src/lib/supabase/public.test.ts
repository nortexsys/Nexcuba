import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

async function importPublicClient() {
  vi.resetModules();
  return import('@/lib/supabase/public');
}

describe('getPublicClient (H9: degrades without env, retry off)', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    createClientMock.mockImplementation((url, key, options) => ({ url, key, options }));
  });

  it('builds the client from NEXT_PUBLIC env with auth disabled and db.retry off', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    const { getPublicClient } = await importPublicClient();
    const client = getPublicClient() as unknown as {
      url: string;
      key: string;
      options: Record<string, unknown>;
    };

    expect(client.url).toBe('https://example.supabase.co');
    expect(client.key).toBe('anon-key');
    expect(client.options.auth).toEqual({ persistSession: false, autoRefreshToken: false });
    expect(client.options.db).toEqual({ retry: false });
  });

  it('does NOT throw without env: degrades to a dead-address client', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const { getPublicClient } = await importPublicClient();
    expect(() => getPublicClient()).not.toThrow();

    const client = getPublicClient() as unknown as {
      url: string;
      key: string;
      options: Record<string, unknown>;
    };
    expect(client.url).toBe('http://127.0.0.1:9');
    expect(client.options.db).toEqual({ retry: false });
  });

  it('returns the same cached instance on repeated calls', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    const { getPublicClient } = await importPublicClient();
    expect(getPublicClient()).toBe(getPublicClient());
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });
});
