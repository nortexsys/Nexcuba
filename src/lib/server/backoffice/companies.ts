import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanyStatus } from '@/lib/auth/session';

/**
 * Company administrative management (tasks 4.3/4.4, spec admin-backoffice):
 * listing, featured toggle and the manual 12-month Premium. Every mutation
 * writes the audit trail — the log is also the Premium history (4.4).
 */

export interface AdminCompanyRow {
  id: string;
  legalName: string;
  displayName: string | null;
  entityType: string;
  status: CompanyStatus;
  isFeatured: boolean;
  premiumUntil: string | null;
  completeness: number;
  createdAt: string;
}

export type CompanyActionResult = { ok: true } | { ok: false; message: string };

export async function listCompanies(
  client: SupabaseClient,
  filters: { status?: CompanyStatus; entityType?: string; featured?: boolean; search?: string },
): Promise<AdminCompanyRow[]> {
  let query = client
    .from('companies')
    .select(
      'id, legal_name, display_name, entity_type, status, is_featured, premium_until, profile_completeness, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.featured !== undefined) query = query.eq('is_featured', filters.featured);
  const search = (filters.search ?? '').replace(/[,()%]/g, ' ').trim();
  if (search.length > 0) query = query.ilike('legal_name', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[listCompanies]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    legalName: row.legal_name as string,
    displayName: (row.display_name as string | null) ?? null,
    entityType: row.entity_type as string,
    status: row.status as CompanyStatus,
    isFeatured: row.is_featured as boolean,
    premiumUntil: (row.premium_until as string | null) ?? null,
    completeness: row.profile_completeness as number,
    createdAt: row.created_at as string,
  }));
}

async function audit(
  client: SupabaseClient,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.rpc('audit', {
    p_action: action,
    p_entity: 'company',
    p_entity_id: entityId,
    p_metadata: metadata,
  });
  if (error) console.error('[companies] audit write failed', error.message);
}

export async function setFeatured(
  client: SupabaseClient,
  reviewerId: string,
  companyId: string,
  featured: boolean,
): Promise<CompanyActionResult> {
  void reviewerId; // audit() stamps auth.uid() server-side
  const { error } = await client
    .from('companies')
    .update({ is_featured: featured })
    .eq('id', companyId);
  if (error) {
    console.error('[setFeatured]', error.message);
    return { ok: false, message: 'No se pudo actualizar el destacado.' };
  }
  await audit(client, featured ? 'company.featured' : 'company.unfeatured', companyId, {
    featured,
  });
  return { ok: true };
}

const DEFAULT_PREMIUM_MONTHS = 12;
const MIN_PREMIUM_MONTHS = 1;
const MAX_PREMIUM_MONTHS = 24;

export async function activatePremium(
  client: SupabaseClient,
  reviewerId: string,
  companyId: string,
  months: number = DEFAULT_PREMIUM_MONTHS,
): Promise<CompanyActionResult> {
  void reviewerId;
  if (months < MIN_PREMIUM_MONTHS || months > MAX_PREMIUM_MONTHS) {
    return { ok: false, message: 'La duración debe estar entre 1 y 24 meses.' };
  }

  const { data, error } = await client
    .from('companies')
    .select('id, entity_type, status, premium_until')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !data) {
    console.error('[activatePremium] fetch', error?.message);
    return { ok: false, message: 'Empresa no encontrada.' };
  }

  const company = data as Record<string, unknown>;
  if (company.entity_type !== 'foreign') {
    return { ok: false, message: 'El Premium solo aplica a empresas extranjeras.' };
  }
  if (company.status !== 'approved') {
    return { ok: false, message: 'La empresa debe estar aprobada.' };
  }
  const currentPremium = company.premium_until as string | null;
  if (currentPremium && new Date(currentPremium).getTime() > Date.now()) {
    return { ok: false, message: `Ya tiene Premium activo hasta ${currentPremium.slice(0, 10)}.` };
  }

  const until = new Date();
  until.setMonth(until.getMonth() + months);
  const premiumUntil = until.toISOString();

  const update = await client
    .from('companies')
    .update({ premium_until: premiumUntil })
    .eq('id', companyId);
  if (update.error) {
    console.error('[activatePremium] update', update.error.message);
    return { ok: false, message: 'No se pudo activar el Premium.' };
  }

  await audit(client, 'company.premium.activate', companyId, {
    months,
    premium_until: premiumUntil,
  });
  return { ok: true };
}

export async function deactivatePremium(
  client: SupabaseClient,
  reviewerId: string,
  companyId: string,
): Promise<CompanyActionResult> {
  void reviewerId;
  const premiumUntil = new Date().toISOString(); // immediate FREE
  const { error } = await client
    .from('companies')
    .update({ premium_until: premiumUntil })
    .eq('id', companyId);
  if (error) {
    console.error('[deactivatePremium]', error.message);
    return { ok: false, message: 'No se pudo desactivar el Premium.' };
  }
  await audit(client, 'company.premium.deactivate', companyId, { premium_until: premiumUntil });
  return { ok: true };
}

export interface PremiumHistoryEntry {
  createdAt: string;
  metadata: Record<string, unknown>;
}

/** Premium history = its audit trail (activation/deactivation entries). */
export async function getPremiumHistory(
  client: SupabaseClient,
  companyId: string,
): Promise<PremiumHistoryEntry[]> {
  const { data, error } = await client
    .from('audit_log')
    .select('created_at, metadata')
    .eq('entity', 'company')
    .eq('entity_id', companyId)
    .in('action', ['company.premium.activate', 'company.premium.deactivate'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPremiumHistory]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    createdAt: row.created_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }));
}
