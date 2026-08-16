import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fase 1 statistics (task 4.8). The counters and the monthly evolution come
 * from the admin-gated security-definer functions over the H2 views — this
 * module only shapes them for the dashboard.
 */

export interface StatsCounters {
  companies_total: number;
  companies_verified: number;
  mipyemes: number;
  cooperatives: number;
  foreign_free: number;
  foreign_premium: number;
  products_published: number;
  services_published: number;
  projects_published: number;
  opportunities_published: number;
  contact_requests_total: number;
  contact_requests_pending: number;
  contacts_established: number;
}

export interface EvolutionPoint {
  month: string;
  companies_created: number;
  products_created: number;
  services_created: number;
  projects_created: number;
  opportunities_created: number;
}

export async function getStatsCounters(client: SupabaseClient): Promise<StatsCounters | null> {
  const { data, error } = await client.rpc('get_stats_counters');
  if (error) {
    console.error('[getStatsCounters]', error.message);
    return null;
  }
  const rows = (data ?? []) as StatsCounters[];
  return rows[0] ?? null;
}

export async function getStatsEvolution(client: SupabaseClient): Promise<EvolutionPoint[]> {
  const { data, error } = await client.rpc('get_stats_evolution');
  if (error) {
    console.error('[getStatsEvolution]', error.message);
    return [];
  }
  return (data ?? []) as EvolutionPoint[];
}
