import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

async function importServiceClient() {
  vi.resetModules();
  return import('@/lib/server/supabase-service');
}

describe('getServiceClient (server-only, bypasses RLS)', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // Public env must be complete for the service factory too (it reuses url).
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    createClientMock.mockReset();
    createClientMock.mockImplementation(() => ({ auth: 'service' }));
  });

  it('creates a client with URL + service key and no session persistence', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'srk');
    const { getServiceClient } = await importServiceClient();

    const client = getServiceClient();
    expect(client).toEqual({ auth: 'service' });
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'srk', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('is a singleton per module instance', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'srk');
    const { getServiceClient } = await importServiceClient();

    expect(getServiceClient()).toBe(getServiceClient());
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('refuses to run without the service key (CI-safe)', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const { getServiceClient } = await importServiceClient();

    expect(() => getServiceClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
