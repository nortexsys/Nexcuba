import type { SupabaseClient } from '@supabase/supabase-js';
import { computeNetworkingRight } from '@/lib/public/queries';

/**
 * Portal dashboard (task 6.1, spec company-portal): completeness, content
 * counts per type and networking activity. Counting failures degrade to
 * zeros — the dashboard must always render.
 */

export interface PortalDashboard {
  completeness: number;
  canPublish: boolean;
  /** Foreign company without active Premium → show the Premium CTA. */
  isForeignFree: boolean;
  counts: {
    products: number;
    services: number;
    projects: number;
    opportunities: number;
  };
  pendingRequests: number;
  establishedContacts: number;
}

function relation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  return (value as Record<string, unknown> | null) ?? null;
}

async function countRows(
  client: SupabaseClient,
  table: 'products' | 'services' | 'projects' | 'opportunities',
  companyId: string,
): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .limit(1);
  if (error) {
    console.error('[getPortalDashboard] count', table, error.message);
    return 0;
  }
  return count ?? 0;
}

async function countNetworking(
  client: SupabaseClient,
  companyId: string,
): Promise<{
  pending: number;
  established: number;
}> {
  const [pending, established] = await Promise.all([
    client
      .from('contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('target_company_id', companyId)
      .eq('status', 'pending')
      .limit(1),
    client
      .from('contact_requests')
      .select('id', { count: 'exact', head: true })
      .or(`requester_company_id.eq.${companyId},target_company_id.eq.${companyId}`)
      .eq('status', 'accepted')
      .limit(1),
  ]);
  if (pending.error) console.error('[getPortalDashboard] pending', pending.error.message);
  if (established.error)
    console.error('[getPortalDashboard] established', established.error.message);
  return {
    pending: pending.error ? 0 : (pending.count ?? 0),
    established: established.error ? 0 : (established.count ?? 0),
  };
}

export async function getPortalDashboard(client: SupabaseClient): Promise<PortalDashboard | null> {
  const { data, error } = await client
    .from('profiles')
    .select('role, company_id, companies(entity_type, status, premium_until, profile_completeness)')
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[getPortalDashboard]', error.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  const companyId = row.company_id as string | null;
  if (!companyId) return null;

  const company = relation(row.companies);
  const entityType = (company?.entity_type as string) ?? '';
  const status = (company?.status as string) ?? '';
  const premiumUntil = (company?.premium_until as string | null) ?? null;

  // Same predicate as networking/content RLS (single source of truth).
  const canPublish = computeNetworkingRight({
    role: 'company',
    status,
    entityType,
    premiumUntil,
  });
  const premiumActive = Boolean(premiumUntil && new Date(premiumUntil).getTime() > Date.now());

  const [products, services, projects, opportunities, networking] = await Promise.all([
    countRows(client, 'products', companyId),
    countRows(client, 'services', companyId),
    countRows(client, 'projects', companyId),
    countRows(client, 'opportunities', companyId),
    countNetworking(client, companyId),
  ]);

  return {
    completeness: (company?.profile_completeness as number) ?? 0,
    canPublish,
    isForeignFree: entityType === 'foreign' && !premiumActive,
    counts: { products, services, projects, opportunities },
    pendingRequests: networking.pending,
    establishedContacts: networking.established,
  };
}
