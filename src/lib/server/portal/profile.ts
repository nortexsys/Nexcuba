import type { SupabaseClient } from '@supabase/supabase-js';
import { parseSocials, type SocialLink } from '@/lib/public/queries';

/**
 * Own-company profile self-service (task 6.2, spec company-ficha): read the
 * ficha fields, update the NON-privileged columns only (status, entity_type,
 * premium… are admin-domain — the DB trigger blocks them anyway) and replace
 * sector links. Completeness is recomputed by trigger 0010 on save.
 */

export type PortalActionResult = { ok: true } | { ok: false; message: string };

const HTTP_URL = /^https?:\/\/\S+$/i;
const MAX_SOCIALS = 4;
const MAX_SECTORS = 5;

export interface OwnCompanyProfile {
  companyId: string;
  slug: string;
  legalName: string;
  displayName: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  provinceId: number | null;
  municipalityId: number | null;
  socials: SocialLink[];
  entityType: string;
  status: string;
  premiumUntil: string | null;
  completeness: number;
  sectorIds: string[];
}

function relation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  return (value as Record<string, unknown> | null) ?? null;
}

export async function getOwnProfile(client: SupabaseClient): Promise<OwnCompanyProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select(
      `role, company_id,
       companies(id, slug, legal_name, display_name, description, phone, email, website,
                 address, province_id, municipality_id, socials, entity_type, status,
                 premium_until, profile_completeness),
       company_sectors(sector_id)`,
    )
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[getOwnProfile]', error.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  const company = relation(row.companies);
  const sectorLinks = Array.isArray(row.company_sectors)
    ? (row.company_sectors as Record<string, unknown>[])
    : [];

  return {
    companyId: row.company_id as string,
    slug: (company?.slug as string) ?? '',
    legalName: (company?.legal_name as string) ?? '',
    displayName: (company?.display_name as string | null) ?? null,
    description: (company?.description as string | null) ?? null,
    phone: (company?.phone as string | null) ?? null,
    email: (company?.email as string | null) ?? null,
    website: (company?.website as string | null) ?? null,
    address: (company?.address as string | null) ?? null,
    provinceId: (company?.province_id as number | null) ?? null,
    municipalityId: (company?.municipality_id as number | null) ?? null,
    socials: parseSocials(company?.socials),
    entityType: (company?.entity_type as string) ?? '',
    status: (company?.status as string) ?? '',
    premiumUntil: (company?.premium_until as string | null) ?? null,
    completeness: (company?.profile_completeness as number) ?? 0,
    sectorIds: sectorLinks.map((link) => link.sector_id as string).filter(Boolean),
  };
}

export interface OwnProfilePatch {
  displayName?: string;
  description?: string;
  phone?: string;
  website?: string | null;
  address?: string;
  provinceId?: number;
  municipalityId?: number;
  socials?: SocialLink[];
}

export async function updateOwnProfile(
  client: SupabaseClient,
  companyId: string,
  patch: OwnProfilePatch,
): Promise<PortalActionResult> {
  if (patch.website !== undefined && patch.website !== null && patch.website.trim() !== '') {
    if (!HTTP_URL.test(patch.website.trim())) {
      return {
        ok: false,
        message: 'La página web debe ser una URL válida que empiece por http:// o https://.',
      };
    }
  }
  if (patch.socials !== undefined) {
    if (patch.socials.length > MAX_SOCIALS) {
      return { ok: false, message: `Puedes añadir como máximo ${MAX_SOCIALS} redes sociales.` };
    }
    for (const link of patch.socials) {
      if (!link.platform.trim() || !HTTP_URL.test((link.url ?? '').trim())) {
        return {
          ok: false,
          message:
            'Cada red social necesita una plataforma y una URL válida que empiece por http:// o https://.',
        };
      }
    }
  }

  const columns: Record<string, unknown> = {};
  if (patch.displayName !== undefined) columns.display_name = patch.displayName.trim();
  if (patch.description !== undefined) columns.description = patch.description.trim();
  if (patch.phone !== undefined) columns.phone = patch.phone.trim();
  if (patch.website !== undefined) {
    columns.website =
      patch.website?.trim() === '' || patch.website === null ? null : patch.website.trim();
  }
  if (patch.address !== undefined) columns.address = patch.address.trim();
  if (patch.provinceId !== undefined) columns.province_id = patch.provinceId;
  if (patch.municipalityId !== undefined) columns.municipality_id = patch.municipalityId;
  if (patch.socials !== undefined) {
    columns.socials = patch.socials.map((link) => ({
      platform: link.platform.trim(),
      url: link.url.trim(),
    }));
  }

  const { error } = await client.from('companies').update(columns).eq('id', companyId);
  if (error) {
    if (error.message.includes('companies_municipality_id_fkey')) {
      return { ok: false, message: 'El municipio no pertenece a la provincia.' };
    }
    console.error('[updateOwnProfile]', error.message);
    return { ok: false, message: 'No se pudo guardar el perfil. Inténtalo de nuevo.' };
  }
  return { ok: true };
}

export async function setOwnSectors(
  client: SupabaseClient,
  companyId: string,
  sectorIds: string[],
): Promise<PortalActionResult> {
  const unique = [...new Set(sectorIds)];
  if (unique.length > MAX_SECTORS) {
    return { ok: false, message: `Puedes seleccionar como máximo ${MAX_SECTORS} sectores.` };
  }

  const { error: deleteError } = await client
    .from('company_sectors')
    .delete()
    .eq('company_id', companyId);
  if (deleteError) {
    console.error('[setOwnSectors] delete', deleteError.message);
    return { ok: false, message: 'No se pudieron guardar los sectores.' };
  }

  if (unique.length === 0) return { ok: true };

  const { error } = await client
    .from('company_sectors')
    .insert(unique.map((sectorId) => ({ company_id: companyId, sector_id: sectorId })));
  if (error) {
    console.error('[setOwnSectors] insert', error.message);
    return { ok: false, message: 'No se pudieron guardar los sectores.' };
  }
  return { ok: true };
}
