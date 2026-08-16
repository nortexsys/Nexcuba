import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanyStatus } from '@/lib/auth/session';

/**
 * Registration applications inbox (task 4.2, spec admin-backoffice). All
 * queries run with the admin's session client — RLS hides everything from
 * non-admins, so "not found" doubles as the authorization answer.
 */

export interface ApplicationSummary {
  id: string;
  status: CompanyStatus;
  applicantName: string;
  applicantEmail: string;
  createdAt: string;
  rejectionReason: string | null;
  companyId: string;
  companyName: string;
  entityType: string;
}

export interface ApplicationDocument {
  id: string;
  mime: string;
  sizeBytes: number;
  url: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  applicantPhone: string | null;
  payload: Record<string, unknown>;
  reviewedAt: string | null;
  company: {
    id: string;
    legalName: string;
    displayName: string | null;
    entityType: string;
    status: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
  } | null;
  documents: ApplicationDocument[];
}

type CompanyRelation = Record<string, unknown> | Record<string, unknown>[] | null | undefined;

function pickCompany(relation: CompanyRelation): Record<string, unknown> | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

/** Strips PostgREST-filter-breaking characters from free-text search. */
function sanitizeSearch(search: string): string {
  return search.replace(/[,()%]/g, ' ').trim();
}

export async function listApplications(
  client: SupabaseClient,
  filters: { status?: CompanyStatus; search?: string },
): Promise<ApplicationSummary[]> {
  let query = client
    .from('registration_applications')
    .select(
      'id, status, applicant_name, applicant_email, created_at, rejection_reason, companies(id, legal_name, entity_type)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq('status', filters.status);
  const search = sanitizeSearch(filters.search ?? '');
  if (search.length > 0) {
    query = query.or(`applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listApplications]', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const company = pickCompany(row.companies as CompanyRelation);
    return {
      id: row.id as string,
      status: row.status as CompanyStatus,
      applicantName: row.applicant_name as string,
      applicantEmail: row.applicant_email as string,
      createdAt: row.created_at as string,
      rejectionReason: (row.rejection_reason as string | null) ?? null,
      companyId: (company?.id as string) ?? '',
      companyName: (company?.legal_name as string) ?? '',
      entityType: (company?.entity_type as string) ?? '',
    };
  });
}

const SIGNED_URL_TTL_SECONDS = 600;

export async function getApplicationDetail(
  client: SupabaseClient,
  id: string,
): Promise<ApplicationDetail | null> {
  const { data, error } = await client
    .from('registration_applications')
    .select(
      `id, status, applicant_name, applicant_email, applicant_phone, payload,
       created_at, reviewed_at, rejection_reason,
       companies(id, legal_name, display_name, entity_type, status, phone, email, website, address)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[getApplicationDetail]', error.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  const company = pickCompany(row.companies as CompanyRelation);

  const { data: documents, error: docsError } = await client
    .from('verification_documents')
    .select('id, storage_path, mime, size_bytes')
    .eq('application_id', id);

  if (docsError) console.error('[getApplicationDetail] documents', docsError.message);

  const resolvedDocuments: ApplicationDocument[] = [];
  for (const document of (documents ?? []) as Record<string, unknown>[]) {
    const storagePath = document.storage_path as string;
    const { data: signed } = await client.storage
      .from('verification-docs')
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    resolvedDocuments.push({
      id: document.id as string,
      mime: document.mime as string,
      sizeBytes: document.size_bytes as number,
      url: signed?.signedUrl ?? '',
    });
  }

  return {
    id: row.id as string,
    status: row.status as CompanyStatus,
    applicantName: row.applicant_name as string,
    applicantEmail: row.applicant_email as string,
    applicantPhone: (row.applicant_phone as string | null) ?? null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    companyId: (company?.id as string) ?? '',
    companyName: (company?.legal_name as string) ?? '',
    entityType: (company?.entity_type as string) ?? '',
    company: company
      ? {
          id: company.id as string,
          legalName: company.legal_name as string,
          displayName: (company.display_name as string | null) ?? null,
          entityType: company.entity_type as string,
          status: company.status as string,
          phone: (company.phone as string | null) ?? null,
          email: (company.email as string | null) ?? null,
          website: (company.website as string | null) ?? null,
          address: (company.address as string | null) ?? null,
        }
      : null,
    documents: resolvedDocuments,
  };
}
