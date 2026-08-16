import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  activatePremium,
  deactivatePremium,
  getPremiumHistory,
  listCompanies,
  setFeatured,
} from '@/lib/server/backoffice/companies';

const companyRow = {
  id: 'c-1',
  legal_name: 'Foreign SL',
  display_name: 'Foreign',
  entity_type: 'foreign',
  status: 'approved',
  is_featured: false,
  premium_until: null,
  profile_completeness: 40,
  created_at: '2026-08-01T00:00:00Z',
};

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    companies: { rows: [companyRow], row: companyRow },
    audit_log: { rows: [] },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listCompanies (4.3)', () => {
  it('maps rows with camelCase admin fields', async () => {
    const rows = await listCompanies(h.client, {});
    expect(rows[0]).toMatchObject({
      id: 'c-1',
      legalName: 'Foreign SL',
      entityType: 'foreign',
      status: 'approved',
      isFeatured: false,
    });
  });

  it('passes the filters through', async () => {
    await listCompanies(h.client, { status: 'approved', featured: true, search: ' Foreign ' });
    const filters = h.calls.eqFilters['companies'];
    expect(filters).toContainEqual({ column: 'status', value: 'approved' });
    expect(filters).toContainEqual({ column: 'is_featured', value: true });
  });
});

describe('setFeatured (4.3, audit-logged)', () => {
  it('updates is_featured and writes the audit trail', async () => {
    const result = await setFeatured(h.client, 'admin-u1', 'c-1', true);
    expect(result).toEqual({ ok: true });

    expect(h.calls.updates['companies']?.[0]).toMatchObject({ is_featured: true });
    expect(h.calls.rpc).toHaveBeenCalledWith(
      'audit',
      expect.objectContaining({
        p_action: 'company.featured',
        p_entity: 'company',
        p_entity_id: 'c-1',
      }),
    );
  });

  it('uses the unfeatured action when turning it off', async () => {
    await setFeatured(h.client, 'admin-u1', 'c-1', false);
    const args = h.calls.rpc.mock.calls.find(([fn]) => fn === 'audit')?.[1] as Record<
      string,
      unknown
    >;
    expect(args.p_action).toBe('company.unfeatured');
  });

  it('fails cleanly on a database error', async () => {
    h = makeSupabaseClient({ companies: { error: { message: 'boom' } } });
    const result = await setFeatured(h.client, 'admin-u1', 'c-1', true);
    expect(result.ok).toBe(false);
    expect(h.calls.rpc).not.toHaveBeenCalled();
  });
});

describe('activatePremium (4.4: manual, 12 months)', () => {
  it('rejects non-foreign companies', async () => {
    h = makeSupabaseClient({
      companies: { row: { ...companyRow, entity_type: 'mipyme' } },
    });
    const result = await activatePremium(h.client, 'admin-u1', 'c-1');
    expect(result).toEqual({
      ok: false,
      message: 'El Premium solo aplica a empresas extranjeras.',
    });
    expect(h.calls.updates['companies']).toBeUndefined();
  });

  it('rejects companies that are not approved', async () => {
    h = makeSupabaseClient({
      companies: { row: { ...companyRow, status: 'pending' } },
    });
    const result = await activatePremium(h.client, 'admin-u1', 'c-1');
    expect(result).toEqual({ ok: false, message: 'La empresa debe estar aprobada.' });
  });

  it('rejects an already-active premium', async () => {
    h = makeSupabaseClient({
      companies: {
        row: { ...companyRow, premium_until: new Date(Date.now() + 86_400_000).toISOString() },
      },
    });
    const result = await activatePremium(h.client, 'admin-u1', 'c-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Ya tiene Premium activo');
  });

  it('sets premium_until 12 months ahead and audits with the expiry', async () => {
    const result = await activatePremium(h.client, 'admin-u1', 'c-1');
    expect(result).toEqual({ ok: true });

    const patch = h.calls.updates['companies']?.[0] as { premium_until: string };
    const monthsAhead =
      (new Date(patch.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
    expect(monthsAhead).toBeGreaterThan(11.5);
    expect(monthsAhead).toBeLessThan(12.5);

    const args = h.calls.rpc.mock.calls.find(([fn]) => fn === 'audit')?.[1] as Record<
      string,
      unknown
    >;
    expect(args.p_action).toBe('company.premium.activate');
    expect((args.p_metadata as Record<string, unknown>).premium_until).toBe(patch.premium_until);
  });

  it('supports a custom duration only within 1–24 months', async () => {
    const tooMuch = await activatePremium(h.client, 'admin-u1', 'c-1', 36);
    expect(tooMuch).toEqual({ ok: false, message: 'La duración debe estar entre 1 y 24 meses.' });
    const ok = await activatePremium(h.client, 'admin-u1', 'c-1', 3);
    expect(ok.ok).toBe(true);
    const patch = h.calls.updates['companies']?.[0] as { premium_until: string };
    const monthsAhead =
      (new Date(patch.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
    expect(monthsAhead).toBeLessThan(3.5);
  });
});

describe('deactivatePremium (4.4)', () => {
  it('expires immediately and audits', async () => {
    const result = await deactivatePremium(h.client, 'admin-u1', 'c-1');
    expect(result).toEqual({ ok: true });
    expect(h.calls.updates['companies']?.[0]).toHaveProperty('premium_until');
    const args = h.calls.rpc.mock.calls.find(([fn]) => fn === 'audit')?.[1] as Record<
      string,
      unknown
    >;
    expect(args.p_action).toBe('company.premium.deactivate');
  });
});

describe('getPremiumHistory (4.4: audit as history)', () => {
  it('reads only premium actions for the company, newest first', async () => {
    h = makeSupabaseClient({
      audit_log: {
        rows: [{ created_at: '2026-08-01', metadata: { months: 12 } }],
      },
    });
    const history = await getPremiumHistory(h.client, 'c-1');
    expect(history).toEqual([{ createdAt: '2026-08-01', metadata: { months: 12 } }]);
    const filters = h.calls.eqFilters['audit_log'];
    expect(filters).toContainEqual({ column: 'entity', value: 'company' });
    expect(filters).toContainEqual({ column: 'entity_id', value: 'c-1' });
  });
});
