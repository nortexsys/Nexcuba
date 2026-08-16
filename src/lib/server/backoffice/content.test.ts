import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { deleteContent, listContent, setContentHidden } from '@/lib/server/backoffice/content';

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    products: {
      rows: [
        {
          id: 'p-1',
          name: 'Café torrefacto',
          is_hidden: false,
          created_at: '2026-08-10T00:00:00Z',
          companies: { legal_name: 'Cubana A' },
        },
      ],
      row: { id: 'p-1', name: 'Café torrefacto' },
    },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listContent (4.6 browse all)', () => {
  it('maps rows with company name and hidden flag', async () => {
    const rows = await listContent(h.client, 'products', {});
    expect(rows[0]).toMatchObject({
      id: 'p-1',
      name: 'Café torrefacto',
      hidden: false,
      companyName: 'Cubana A',
    });
  });

  it('applies the hidden filter', async () => {
    await listContent(h.client, 'products', { hidden: true });
    expect(h.calls.eqFilters['products']).toContainEqual({ column: 'is_hidden', value: true });
  });
});

describe('setContentHidden (4.6 hide/unhide, audit-logged)', () => {
  it('hides content and audits with the entity name', async () => {
    const result = await setContentHidden(h.client, 'admin-u1', 'products', 'p-1', true);
    expect(result).toEqual({ ok: true });
    expect(h.calls.updates['products']?.[0]).toEqual({ is_hidden: true });
    expect(h.calls.rpc).toHaveBeenCalledWith(
      'audit',
      expect.objectContaining({
        p_action: 'content.hide',
        p_entity: 'products',
        p_entity_id: 'p-1',
        p_metadata: { name: 'Café torrefacto' },
      }),
    );
  });

  it('unhide uses the unhide action', async () => {
    await setContentHidden(h.client, 'admin-u1', 'products', 'p-1', false);
    const args = h.calls.rpc.mock.calls.find(([fn]) => fn === 'audit')?.[1] as Record<
      string,
      unknown
    >;
    expect(args.p_action).toBe('content.unhide');
  });

  it.each(['companies', 'audit_log', 'profiles'])('refuses table %s (whitelist)', async (table) => {
    const result = await setContentHidden(h.client, 'admin-u1', table as 'products', 'x', true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Tipo de contenido no válido');
    expect(h.calls.updates[table]).toBeUndefined();
  });
});

describe('deleteContent (4.6)', () => {
  it('deletes and audits', async () => {
    const result = await deleteContent(h.client, 'admin-u1', 'products', 'p-1');
    expect(result).toEqual({ ok: true });
    expect(h.calls.deletes['products']).toContain('p-1');
    expect(h.calls.rpc).toHaveBeenCalledWith(
      'audit',
      expect.objectContaining({ p_action: 'content.delete', p_entity: 'products' }),
    );
  });

  it('refuses unknown tables', async () => {
    const result = await deleteContent(h.client, 'admin-u1', 'users' as 'products', 'x');
    expect(result.ok).toBe(false);
    expect(h.calls.deletes['users']).toBeUndefined();
  });
});
