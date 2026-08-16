import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getCrmRecord, listCrmRecords, upsertCrmRecord } from '@/lib/server/backoffice/crm';

const crmRow = {
  company_id: 'c-1',
  has_website: true,
  has_domain: false,
  has_corporate_email: true,
  has_socials: false,
  profile_completeness_snapshot: 45,
  digital_needs: 'Necesita tienda online',
  commercial_potential: 'high',
  followup_status: 'primer contacto',
  notes: 'Interesada en Premium',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    crm_records: { rows: [crmRow], row: crmRow },
    companies: { row: { id: 'c-1', profile_completeness: 45 } },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getCrmRecord (4.9)', () => {
  it('maps the row to camelCase', async () => {
    const record = await getCrmRecord(h.client, 'c-1');
    expect(record).toMatchObject({
      companyId: 'c-1',
      hasWebsite: true,
      hasDomain: false,
      commercialPotential: 'high',
      completenessSnapshot: 45,
    });
  });

  it('returns null when there is no record yet', async () => {
    h = makeSupabaseClient({ crm_records: { row: null } });
    expect(await getCrmRecord(h.client, 'c-1')).toBeNull();
  });
});

describe('upsertCrmRecord (4.9, audit-logged)', () => {
  const input = {
    hasWebsite: true,
    hasDomain: true,
    hasCorporateEmail: false,
    hasSocials: false,
    digitalNeeds: 'Web y dominio propio',
    commercialPotential: 'medium' as const,
    followupStatus: 'seguimiento',
    notes: '',
  };

  it('upserts with a fresh completeness snapshot and audits', async () => {
    const result = await upsertCrmRecord(h.client, 'admin-u1', 'c-1', input);
    expect(result).toEqual({ ok: true });

    expect(h.calls.inserts['crm_records']?.[0]).toMatchObject({
      company_id: 'c-1',
      has_website: true,
      has_domain: true,
      commercial_potential: 'medium',
      profile_completeness_snapshot: 45,
    });
    expect(h.calls.rpc).toHaveBeenCalledWith(
      'audit',
      expect.objectContaining({ p_action: 'crm.upsert', p_entity: 'company', p_entity_id: 'c-1' }),
    );
  });

  it('validates the commercial potential enum', async () => {
    const result = await upsertCrmRecord(h.client, 'admin-u1', 'c-1', {
      ...input,
      commercialPotential: 'enorme' as 'low',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('potencial comercial');
    expect(h.calls.inserts['crm_records']).toBeUndefined();
  });

  it('fails cleanly when the company cannot be read', async () => {
    h = makeSupabaseClient({ companies: { row: null } });
    const result = await upsertCrmRecord(h.client, 'admin-u1', 'c-1', input);
    expect(result).toEqual({ ok: false, message: 'Empresa no encontrada.' });
  });
});

describe('listCrmRecords (4.9 overview)', () => {
  it('joins the company name for the overview table', async () => {
    h = makeSupabaseClient({
      crm_records: {
        rows: [{ ...crmRow, companies: { legal_name: 'Cubana A', entity_type: 'mipyme' } }],
      },
    });
    const rows = await listCrmRecords(h.client);
    expect(rows[0]).toMatchObject({
      companyName: 'Cubana A',
      entityType: 'mipyme',
      notes: 'Interesada en Premium',
    });
  });
});
