import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Internal digitalization CRM (task 4.9, spec admin-backoffice). RLS makes
 * crm_records admin-only, so the module needs no extra visibility guards —
 * but we never expose CRM fields through any public/company-facing API.
 */

const crmInputSchema = z.object({
  hasWebsite: z.boolean(),
  hasDomain: z.boolean(),
  hasCorporateEmail: z.boolean(),
  hasSocials: z.boolean(),
  digitalNeeds: z.string().trim().max(2000).optional(),
  commercialPotential: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'El potencial comercial debe ser bajo, medio o alto.' }),
  }),
  followupStatus: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CrmInput = z.infer<typeof crmInputSchema>;

export interface CrmRecord {
  companyId: string;
  hasWebsite: boolean;
  hasDomain: boolean;
  hasCorporateEmail: boolean;
  hasSocials: boolean;
  completenessSnapshot: number;
  digitalNeeds: string | null;
  commercialPotential: 'low' | 'medium' | 'high';
  followupStatus: string | null;
  notes: string | null;
  updatedAt: string;
}

export type CrmResult = { ok: true } | { ok: false; message: string };

function mapRow(row: Record<string, unknown>): CrmRecord {
  return {
    companyId: row.company_id as string,
    hasWebsite: row.has_website as boolean,
    hasDomain: row.has_domain as boolean,
    hasCorporateEmail: row.has_corporate_email as boolean,
    hasSocials: row.has_socials as boolean,
    completenessSnapshot: row.profile_completeness_snapshot as number,
    digitalNeeds: (row.digital_needs as string | null) ?? null,
    commercialPotential: row.commercial_potential as CrmRecord['commercialPotential'],
    followupStatus: (row.followup_status as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    updatedAt: row.updated_at as string,
  };
}

export async function getCrmRecord(
  client: SupabaseClient,
  companyId: string,
): Promise<CrmRecord | null> {
  const { data, error } = await client
    .from('crm_records')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    console.error('[getCrmRecord]', error.message);
    return null;
  }
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function upsertCrmRecord(
  client: SupabaseClient,
  reviewerId: string,
  companyId: string,
  input: CrmInput,
): Promise<CrmResult> {
  void reviewerId;
  const parsed = crmInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Datos CRM no válidos.' };
  }

  // Snapshot the live completeness so the CRM reflects the moment of editing.
  const { data: company, error: companyError } = await client
    .from('companies')
    .select('profile_completeness')
    .eq('id', companyId)
    .maybeSingle();
  if (companyError || !company) {
    console.error('[upsertCrmRecord] company fetch', companyError?.message);
    return { ok: false, message: 'Empresa no encontrada.' };
  }

  const { error } = await client.from('crm_records').upsert({
    company_id: companyId,
    has_website: parsed.data.hasWebsite,
    has_domain: parsed.data.hasDomain,
    has_corporate_email: parsed.data.hasCorporateEmail,
    has_socials: parsed.data.hasSocials,
    profile_completeness_snapshot: (company as Record<string, unknown>)
      .profile_completeness as number,
    digital_needs: parsed.data.digitalNeeds ?? null,
    commercial_potential: parsed.data.commercialPotential,
    followup_status: parsed.data.followupStatus ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (error) {
    console.error('[upsertCrmRecord]', error.message);
    return { ok: false, message: 'No se pudo guardar la ficha CRM.' };
  }

  const audit = await client.rpc('audit', {
    p_action: 'crm.upsert',
    p_entity: 'company',
    p_entity_id: companyId,
    p_metadata: { commercial_potential: parsed.data.commercialPotential },
  });
  if (audit.error) console.error('[upsertCrmRecord] audit write failed', audit.error.message);
  return { ok: true };
}

export interface CrmOverviewRow extends CrmRecord {
  companyName: string;
  entityType: string;
}

export async function listCrmRecords(client: SupabaseClient): Promise<CrmOverviewRow[]> {
  const { data, error } = await client
    .from('crm_records')
    .select('*, companies(legal_name, entity_type)')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[listCrmRecords]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => {
    const company = Array.isArray(row.companies)
      ? (row.companies[0] as Record<string, unknown> | undefined)
      : (row.companies as Record<string, unknown> | undefined);
    return {
      ...mapRow(row),
      companyName: (company?.legal_name as string) ?? '',
      entityType: (company?.entity_type as string) ?? '',
    };
  });
}
