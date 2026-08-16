import { describe, expect, it } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { listContactRequests } from '@/lib/server/backoffice/networking';

describe('listContactRequests (4.7 basic consult)', () => {
  it('maps requester/target names and status', async () => {
    const { client } = makeSupabaseClient({
      contact_requests: {
        rows: [
          {
            id: 'r-1',
            subject: 'Colaboración',
            status: 'accepted',
            created_at: '2026-08-05T00:00:00Z',
            accepted_at: '2026-08-06T00:00:00Z',
            requester: { legal_name: 'Cubana A' },
            target: { legal_name: 'Cubana B' },
          },
        ],
      },
    });

    const rows = await listContactRequests(client, {});
    expect(rows[0]).toMatchObject({
      id: 'r-1',
      subject: 'Colaboración',
      status: 'accepted',
      requesterName: 'Cubana A',
      targetName: 'Cubana B',
    });
  });

  it('applies the status filter', async () => {
    const { client, calls } = makeSupabaseClient({ contact_requests: { rows: [] } });
    await listContactRequests(client, { status: 'pending' });
    expect(calls.eqFilters['contact_requests']).toContainEqual({
      column: 'status',
      value: 'pending',
    });
  });
});
