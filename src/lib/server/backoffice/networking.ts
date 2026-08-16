import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Networking consult (task 4.7, spec admin-backoffice): read-only listing of
 * contact requests with both companies and their status.
 */

export interface ContactRequestRow {
  id: string;
  subject: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt: string | null;
  requesterName: string;
  targetName: string;
}

type CompanyRelation = Record<string, unknown> | Record<string, unknown>[] | null | undefined;

function companyName(relation: CompanyRelation): string {
  const company = Array.isArray(relation)
    ? (relation[0] as Record<string, unknown> | undefined)
    : (relation as Record<string, unknown> | undefined);
  return (company?.legal_name as string) ?? '';
}

export async function listContactRequests(
  client: SupabaseClient,
  filters: { status?: 'pending' | 'accepted' },
): Promise<ContactRequestRow[]> {
  let query = client
    .from('contact_requests')
    .select(
      `id, subject, status, created_at, accepted_at,
       requester:companies!contact_requests_requester_company_id_fkey(legal_name),
       target:companies!contact_requests_target_company_id_fkey(legal_name)`,
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) {
    console.error('[listContactRequests]', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    subject: row.subject as string,
    status: row.status as 'pending' | 'accepted',
    createdAt: row.created_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    requesterName: companyName(row.requester as CompanyRelation),
    targetName: companyName(row.target as CompanyRelation),
  }));
}
