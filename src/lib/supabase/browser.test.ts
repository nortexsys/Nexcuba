import { beforeEach, describe, expect, it, vi } from 'vitest';

const createBrowserClientMock = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClientMock(...args),
}));

async function importBrowserClient() {
  vi.resetModules();
  return import('@/lib/supabase/browser');
}

describe('getBrowserClient', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    createBrowserClientMock.mockReset();
    createBrowserClientMock.mockImplementation(() => ({ auth: 'anon-client' }));
  });

  it('creates a browser client with the public env (anon key only)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    const { getBrowserClient } = await importBrowserClient();

    const client = getBrowserClient();
    expect(client).toEqual({ auth: 'anon-client' });
    expect(createBrowserClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
  });

  it('returns the same singleton instance on repeated calls', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    const { getBrowserClient } = await importBrowserClient();

    const first = getBrowserClient();
    const second = getBrowserClient();
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('fails fast with a clear error when env is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { getBrowserClient } = await importBrowserClient();

    expect(() => getBrowserClient()).toThrow(/Supabase environment invalid/);
    expect(createBrowserClientMock).not.toHaveBeenCalled();
  });
});
