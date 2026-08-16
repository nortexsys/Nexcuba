import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getApplicationDetail, listApplications } from '@/lib/server/backoffice/applications';

const applicationRows = [
  {
    id: 'a-1',
    status: 'pending',
    applicant_name: 'María Fernández',
    applicant_email: 'maria@midigital.cu',
    applicant_phone: '+53 5 123 4567',
    created_at: '2026-08-14T10:00:00Z',
    rejection_reason: null,
    payload: { companyName: 'MiDigital SRL' },
    reviewed_at: null,
    companies: { id: 'c-1', legal_name: 'MiDigital SRL', entity_type: 'mipyme' },
  },
];

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    registration_applications: { rows: applicationRows, row: applicationRows[0] },
    verification_documents: {
      rows: [
        { id: 'd-1', storage_path: 'c-1/a-1/doc.pdf', mime: 'application/pdf', size_bytes: 2048 },
      ],
    },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listApplications (4.2 inbox)', () => {
  it('returns the mapped rows for the admin inbox', async () => {
    const rows = await listApplications(h.client, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'a-1',
      status: 'pending',
      applicantName: 'María Fernández',
      applicantEmail: 'maria@midigital.cu',
      companyName: 'MiDigital SRL',
      entityType: 'mipyme',
    });
  });

  it('normalizes an array-shaped companies relation', async () => {
    h = makeSupabaseClient({
      registration_applications: {
        rows: [
          {
            ...applicationRows[0],
            companies: [{ legal_name: 'Array SL', entity_type: 'foreign', id: 'c-9' }],
          },
        ],
      },
    });
    const rows = await listApplications(h.client, {});
    expect(rows[0]?.companyName).toBe('Array SL');
  });

  it('handles a missing company relation (defensive)', async () => {
    h = makeSupabaseClient({
      registration_applications: { rows: [{ ...applicationRows[0], companies: null }] },
    });
    const rows = await listApplications(h.client, {});
    expect(rows[0]?.companyName).toBe('');
  });

  it('applies status and sanitized search filters through eq/or', async () => {
    await listApplications(h.client, { status: 'pending', search: 'María, Ruiz' });
    const filters = h.calls.eqFilters['registration_applications'];
    expect(filters).toContainEqual({ column: 'status', value: 'pending' });
  });
});

describe('getApplicationDetail (4.2 detail + document viewer)', () => {
  it('joins the full company data and signs the document URLs', async () => {
    const detail = await getApplicationDetail(h.client, 'a-1');

    expect(detail?.id).toBe('a-1');
    expect(detail?.company?.legalName).toBe('MiDigital SRL');
    expect(detail?.documents).toEqual([
      {
        id: 'd-1',
        mime: 'application/pdf',
        sizeBytes: 2048,
        url: 'https://signed.example/verification-docs/c-1/a-1/doc.pdf?ttl=600',
      },
    ]);
  });

  it('returns null when the application is invisible (RLS or missing)', async () => {
    h = makeSupabaseClient({ registration_applications: { row: null } });
    expect(await getApplicationDetail(h.client, 'no-existe')).toBeNull();
  });

  it('survives a failing signed URL by omitting the url', async () => {
    h.client.storage.from = vi.fn(() => ({
      createSignedUrl: vi.fn(async () => ({ data: null, error: { message: 'expired' } })),
    })) as never;
    const detail = await getApplicationDetail(h.client, 'a-1');
    expect(detail?.documents[0]).toMatchObject({ id: 'd-1', url: '' });
  });
});
