import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerClientMock = vi.fn();
const cookieGetAll = vi.fn();
const cookieSet = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: cookieGetAll,
    set: cookieSet,
  }),
}));

async function importServerClient() {
  vi.resetModules();
  return import('@/lib/supabase/server');
}

describe('getServerClient', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    createServerClientMock.mockReset();
    cookieGetAll.mockReset();
    cookieSet.mockReset();
    cookieGetAll.mockReturnValue([{ name: 'sb-token', value: 'abc' }]);
    createServerClientMock.mockImplementation((_url, _key, options) => ({
      kind: 'server-client',
      options,
    }));
  });

  it('creates the client with the caller cookies (RLS runs as the user JWT)', async () => {
    const { getServerClient } = await importServerClient();
    const client = await getServerClient();

    expect(client).toEqual({ kind: 'server-client', options: expect.any(Object) });
    const [, , options] = createServerClientMock.mock.calls[0]!;
    expect(options.cookies.getAll()).toEqual([{ name: 'sb-token', value: 'abc' }]);
  });

  it('propagates cookie writes through setAll', async () => {
    const { getServerClient } = await importServerClient();
    await getServerClient();
    const [, , options] = createServerClientMock.mock.calls[0]!;

    options.cookies.setAll([{ name: 'sb-refresh', value: 'xyz', options: { path: '/' } }]);
    expect(cookieSet).toHaveBeenCalledWith('sb-refresh', 'xyz', { path: '/' });
  });

  it('does not crash when the runtime forbids cookie writes (RSC)', async () => {
    cookieSet.mockImplementation(() => {
      throw new Error('Cookies can only be modified in a Server Action');
    });
    const { getServerClient } = await importServerClient();
    await getServerClient();
    const [, , options] = createServerClientMock.mock.calls[0]!;

    expect(() => options.cookies.setAll([{ name: 'x', value: 'y', options: {} }])).not.toThrow();
  });
});
