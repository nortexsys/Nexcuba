import { describe, expect, it } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getStatsCounters, getStatsEvolution } from '@/lib/server/backoffice/stats';

describe('getStatsCounters (4.8: all Fase 1 counters)', () => {
  it('returns the single counters row from the admin-gated RPC', async () => {
    const counters = {
      companies_total: 10,
      companies_verified: 8,
      mipyemes: 4,
      cooperatives: 2,
      foreign_free: 1,
      foreign_premium: 1,
      products_published: 20,
      services_published: 5,
      projects_published: 2,
      opportunities_published: 1,
      contact_requests_total: 3,
      contact_requests_pending: 1,
      contacts_established: 2,
    };
    const { client } = makeSupabaseClient(
      {},
      { get_stats_counters: { data: [counters], error: null } },
    );

    await expect(getStatsCounters(client)).resolves.toEqual(counters);
  });

  it('returns null when the RPC yields nothing', async () => {
    const { client } = makeSupabaseClient({}, { get_stats_counters: { data: [], error: null } });
    await expect(getStatsCounters(client)).resolves.toBeNull();
  });
});

describe('getStatsEvolution (4.8: altas/publicaciones over time)', () => {
  it('returns the monthly series ordered as delivered', async () => {
    const series = [
      {
        month: '2026-06-01T00:00:00Z',
        companies_created: 2,
        products_created: 4,
        services_created: 1,
        projects_created: 0,
        opportunities_created: 0,
      },
      {
        month: '2026-07-01T00:00:00Z',
        companies_created: 3,
        products_created: 6,
        services_created: 2,
        projects_created: 1,
        opportunities_created: 1,
      },
    ];
    const { client } = makeSupabaseClient(
      {},
      { get_stats_evolution: { data: series, error: null } },
    );

    await expect(getStatsEvolution(client)).resolves.toEqual(series);
  });

  it('returns an empty series gracefully', async () => {
    const { client } = makeSupabaseClient({}, { get_stats_evolution: { data: null, error: null } });
    await expect(getStatsEvolution(client)).resolves.toEqual([]);
  });
});
