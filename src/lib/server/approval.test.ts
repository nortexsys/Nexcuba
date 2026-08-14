import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reviewApplication } from '@/lib/server/approval';

const applicationFixture = {
  id: 'a-1',
  status: 'pending',
  applicant_email: 'solicitante@midigital.cu',
  company_id: 'c-1',
  companies: { legal_name: 'MiDigital SRL' },
};

interface Harness {
  client: SupabaseClient;
  updates: Record<string, Record<string, unknown>[]>;
  rpc: ReturnType<typeof vi.fn>;
  application: typeof applicationFixture;
  failUpdateOn: (table: string) => void;
  sendEmail: ReturnType<typeof vi.fn>;
}

function makeHarness(): Harness {
  const updates: Record<string, Record<string, unknown>[]> = {};
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const failing = { table: '' };
  const application = { ...applicationFixture, companies: { ...applicationFixture.companies } };

  const client = {
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: application, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          if (failing.table === table) return { error: { message: `update ${table} failed` } };
          (updates[table] ??= []).push(patch);
          return { error: null };
        },
      }),
    })),
    rpc,
  } as unknown as SupabaseClient;

  return {
    client,
    updates,
    rpc,
    application,
    failUpdateOn: (table: string) => {
      failing.table = table;
    },
    sendEmail: vi.fn(async () => ({ sent: true })),
  };
}

let h: Harness;
beforeEach(() => {
  h = makeHarness();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const deps = () => ({ client: h.client, reviewerId: 'admin-u1', sendEmail: h.sendEmail });

describe('reviewApplication · rejection path (spec: motivo obligatorio, sin email automático)', () => {
  it('requires a substantive rejection reason', async () => {
    const result = await reviewApplication(deps(), 'a-1', 'reject', '  corto  ');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('motivo');
    expect(h.updates['companies']).toBeUndefined();
  });

  it('marks company + application rejected and stores the reason', async () => {
    const result = await reviewApplication(deps(), 'a-1', 'reject', 'Documento ilegible');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.applicantEmail).toBe('solicitante@midigital.cu');
    expect(h.updates['companies']?.[0]).toMatchObject({ status: 'rejected' });
    expect(h.updates['registration_applications']?.[0]).toMatchObject({
      status: 'rejected',
      rejection_reason: 'Documento ilegible',
      reviewed_by: 'admin-u1',
    });
    expect(h.rpc).toHaveBeenCalledWith(
      'audit',
      expect.objectContaining({
        p_action: 'registration_application.reject',
        p_entity_id: 'a-1',
      }),
    );
    // El motivo se comunica manualmente — nunca email automático
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});

describe('reviewApplication · approval path (spec: activación + email automático)', () => {
  it('approves the company, stamps metadata, audits and emails the applicant', async () => {
    const result = await reviewApplication(deps(), 'a-1', 'approve');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toEqual({ sent: true });

    expect(h.updates['companies']?.[0]).toMatchObject({
      status: 'approved',
      approved_by: 'admin-u1',
    });
    expect(h.updates['companies']?.[0]?.approved_at).toEqual(expect.any(String));
    expect(h.updates['registration_applications']?.[0]).toMatchObject({
      status: 'approved',
      reviewed_by: 'admin-u1',
    });
    expect(h.rpc).toHaveBeenCalledWith(
      'audit',
      expect.objectContaining({
        p_action: 'registration_application.approve',
        p_entity_id: 'a-1',
      }),
    );
    expect(h.sendEmail).toHaveBeenCalledWith('solicitante@midigital.cu', 'MiDigital SRL');
  });

  it('still succeeds when the approval email cannot be sent (best effort)', async () => {
    h.sendEmail.mockResolvedValueOnce({ sent: false, reason: 'missing-key' });
    const result = await reviewApplication(deps(), 'a-1', 'approve');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toEqual({ sent: false, reason: 'missing-key' });
  });

  it('fails cleanly when the company update errors', async () => {
    h.failUpdateOn('companies');
    const result = await reviewApplication(deps(), 'a-1', 'approve');
    expect(result.ok).toBe(false);
    expect(h.sendEmail).not.toHaveBeenCalled();
    expect(h.updates['registration_applications']).toBeUndefined();
  });

  it('fails cleanly when the application update errors', async () => {
    h.failUpdateOn('registration_applications');
    const result = await reviewApplication(deps(), 'a-1', 'approve');
    expect(result.ok).toBe(false);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  it('reject path also fails cleanly when the company update errors', async () => {
    h.failUpdateOn('companies');
    const result = await reviewApplication(deps(), 'a-1', 'reject', 'Documento ilegible');
    expect(result.ok).toBe(false);
  });

  it('continues when the audit rpc fails (logged, not fatal)', async () => {
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: 'audit down' } });
    const result = await reviewApplication(deps(), 'a-1', 'approve');
    expect(result.ok).toBe(true);
  });

  it('reject path: application update failure and audit failure are handled', async () => {
    h.failUpdateOn('registration_applications');
    const failed = await reviewApplication(deps(), 'a-1', 'reject', 'Documento ilegible');
    expect(failed.ok).toBe(false);

    h.failUpdateOn('');
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: 'audit down' } });
    const audited = await reviewApplication(deps(), 'a-1', 'reject', 'Documento ilegible');
    expect(audited.ok).toBe(true);
  });

  it('handles the companies relation arriving as an array', async () => {
    (h.application as { companies: unknown }).companies = [{ legal_name: 'Array SL' }];
    await reviewApplication(deps(), 'a-1', 'approve');
    expect(h.sendEmail).toHaveBeenCalledWith('solicitante@midigital.cu', 'Array SL');
  });

  it('handles a missing company relation gracefully', async () => {
    (h.application as { companies: unknown }).companies = null;
    await reviewApplication(deps(), 'a-1', 'approve');
    expect(h.sendEmail).toHaveBeenCalledWith('solicitante@midigital.cu', '');
  });
});

describe('reviewApplication · guards', () => {
  it('reports "not found" for unknown or RLS-hidden applications', async () => {
    const hidden = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: { code: 'PGRST116' } }) }),
        }),
      })),
      rpc: h.rpc,
    } as unknown as SupabaseClient;
    const result = await reviewApplication(
      { client: hidden, reviewerId: 'admin-u1', sendEmail: h.sendEmail },
      'inexistente',
      'approve',
    );
    expect(result).toEqual({ ok: false, message: 'Solicitud no encontrada.' });
  });

  it('refuses to review an application twice', async () => {
    h.application.status = 'approved';
    const result = await reviewApplication(deps(), 'a-1', 'approve');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('ya fue revisada');
    expect(h.updates['companies']).toBeUndefined();
  });
});
