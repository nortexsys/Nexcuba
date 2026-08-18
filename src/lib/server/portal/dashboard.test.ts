import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getPortalDashboard } from '@/lib/server/portal/dashboard';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const baseProfile = {
  role: 'company',
  company_id: 'c-1',
  companies: {
    entity_type: 'mipyme',
    status: 'approved',
    premium_until: null,
    profile_completeness: 70,
  },
};

function harness(entityType: string, premium: string | null = null) {
  return makeSupabaseClient({
    profiles: {
      row: {
        ...baseProfile,
        companies: {
          entity_type: entityType,
          status: 'approved',
          premium_until: premium,
          profile_completeness: 70,
        },
      },
    },
    products: { count: 3 },
    services: { count: 2 },
    projects: { count: 1 },
    opportunities: { count: 0 },
    contact_requests: { count: 2 },
  });
}

describe('getPortalDashboard (6.1)', () => {
  it('summarizes completeness, counts and networking activity', async () => {
    const h = harness('mipyme');
    const dashboard = await getPortalDashboard(h.client);

    expect(dashboard).toMatchObject({
      completeness: 70,
      canPublish: true,
      isForeignFree: false,
      counts: { products: 3, services: 2, projects: 1, opportunities: 0 },
      pendingRequests: 2,
      establishedContacts: 2,
    });
    const filters = h.calls.eqFilters['contact_requests'];
    expect(filters).toContainEqual({ column: 'status', value: 'pending' });
    expect(h.calls.orFilters['contact_requests']?.[0]).toContain('requester_company_id.eq.c-1');
  });

  it('flags foreign FREE with the Premium affordance', async () => {
    const h = harness('foreign');
    const dashboard = await getPortalDashboard(h.client);
    expect(dashboard?.canPublish).toBe(false);
    expect(dashboard?.isForeignFree).toBe(true);
  });

  it('foreign with active premium can publish', async () => {
    const h = harness('foreign', '2999-01-01T00:00:00Z');
    const dashboard = await getPortalDashboard(h.client);
    expect(dashboard?.canPublish).toBe(true);
    expect(dashboard?.isForeignFree).toBe(false);
  });

  it('returns null without a profile', async () => {
    const h = makeSupabaseClient({ profiles: { row: null } });
    expect(await getPortalDashboard(h.client)).toBeNull();
  });

  it('survives counting failures with zeros', async () => {
    const h = makeSupabaseClient({
      profiles: { row: baseProfile },
      products: { error: { message: 'boom' } },
      services: { error: { message: 'boom' } },
      projects: { error: { message: 'boom' } },
      opportunities: { error: { message: 'boom' } },
      contact_requests: { error: { message: 'boom' } },
    });
    const dashboard = await getPortalDashboard(h.client);
    expect(dashboard?.counts).toEqual({
      products: 0,
      services: 0,
      projects: 0,
      opportunities: 0,
    });
    expect(dashboard?.pendingRequests).toBe(0);
  });
});
