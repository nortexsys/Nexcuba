import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Public-area queries (H5, specs public-directory + search-discovery §12.3).
 * Every function receives an ANON client — RLS already restricts results to
 * approved companies and publicly visible content, so no visibility logic is
 * duplicated here. All queries degrade gracefully (errors → empty) so pages
 * keep rendering even without Supabase configuration (CI, incidents).
 */

export type PublicContentType = 'products' | 'services' | 'projects' | 'opportunities';

export const PUBLIC_CONTENT_TYPES: readonly PublicContentType[] = [
  'products',
  'services',
  'projects',
  'opportunities',
];

export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('[public] query failed', error);
    return fallback;
  }
}

// ── media ─────────────────────────────────────────────────────────────────────

export function mediaPublicUrl(client: SupabaseClient, path: string): string {
  return client.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export function parseSocials(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { platform: string; url: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).platform === 'string' &&
      typeof (item as Record<string, unknown>).url === 'string' &&
      (item as Record<string, unknown>).url !== '',
  );
}

// ── companies ─────────────────────────────────────────────────────────────────

type Relation = Record<string, unknown> | Record<string, unknown>[] | null | undefined;

function one(relation: Relation): Record<string, unknown> | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function sanitizeSearch(search: string | undefined): string {
  return (search ?? '').replace(/[,()%]/g, ' ').trim();
}

const COMPANY_BASE_COLUMNS =
  'id, slug, display_name, legal_name, entity_type, description, logo_path, created_at, municipalities(name), provinces(name), company_sectors(sectors(name))';

export interface PublicCompanyCard {
  id: string;
  slug: string;
  name: string;
  entityType: string;
  description: string | null;
  logoUrl: string | null;
  municipalityName: string | null;
  provinceName: string | null;
  sectorNames: string[];
  createdAt: string;
}

function mapCompanyCard(client: SupabaseClient, row: Record<string, unknown>): PublicCompanyCard {
  const municipality = one(row.municipalities as Relation);
  const province = one(row.provinces as Relation);
  const sectorLinks = Array.isArray(row.company_sectors)
    ? (row.company_sectors as Record<string, unknown>[])
    : [];
  const logoPath = row.logo_path as string | null;
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: ((row.display_name as string | null) ?? (row.legal_name as string)) || '',
    entityType: row.entity_type as string,
    description: (row.description as string | null) ?? null,
    logoUrl: logoPath ? mediaPublicUrl(client, logoPath) : null,
    municipalityName: (municipality?.name as string) ?? null,
    provinceName: (province?.name as string) ?? null,
    sectorNames: sectorLinks
      .map((link) => (one(link.sectors as Relation)?.name as string) ?? '')
      .filter(Boolean),
    createdAt: row.created_at as string,
  };
}

export interface CompanyDirectoryFilters {
  entityType?: string;
  sectorSlug?: string;
  provinceId?: number;
  municipalityId?: number;
  search?: string;
}

export async function listPublicCompanies(
  client: SupabaseClient,
  filters: CompanyDirectoryFilters,
): Promise<PublicCompanyCard[]> {
  const columns = filters.sectorSlug
    ? 'id, slug, display_name, legal_name, entity_type, description, logo_path, created_at, municipalities(name), provinces(name), company_sectors!inner(sectors!inner(name, slug))'
    : COMPANY_BASE_COLUMNS;

  let query = client
    .from('companies')
    .select(columns)
    .order('created_at', { ascending: false })
    .limit(60);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.provinceId) query = query.eq('province_id', filters.provinceId);
  if (filters.municipalityId) query = query.eq('municipality_id', filters.municipalityId);
  if (filters.sectorSlug) query = query.eq('company_sectors.sectors.slug', filters.sectorSlug);
  const search = sanitizeSearch(filters.search);
  if (search.length > 0) {
    query = query.or(`display_name.ilike.%${search}%,legal_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listPublicCompanies]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapCompanyCard(client, row));
}

export interface PublicCompanyDetail extends PublicCompanyCard {
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  socials: SocialLink[];
}

export async function getPublicCompanyBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<PublicCompanyDetail | null> {
  const { data, error } = await client
    .from('companies')
    .select(`${COMPANY_BASE_COLUMNS}, phone, email, website, address, socials`)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[getPublicCompanyBySlug]', error.message);
    return null;
  }
  if (!data) return null;

  const card = mapCompanyCard(client, data as Record<string, unknown>);
  const row = data as Record<string, unknown>;
  return {
    ...card,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    socials: parseSocials(row.socials),
  };
}

export async function getFeaturedCompanies(client: SupabaseClient): Promise<PublicCompanyCard[]> {
  const { data, error } = await client
    .from('companies')
    .select(COMPANY_BASE_COLUMNS)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) {
    console.error('[getFeaturedCompanies]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapCompanyCard(client, row));
}

export async function countPublicProductsByCompany(
  client: SupabaseClient,
  companyIds: string[],
): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map();
  const { data, error } = await client
    .from('products')
    .select('company_id')
    .in('company_id', companyIds)
    .limit(1000);
  if (error) {
    console.error('[countPublicProductsByCompany]', error.message);
    return new Map();
  }
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = row.company_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

// ── content ───────────────────────────────────────────────────────────────────

export interface PublicContentItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  companyName: string;
  companySlug: string;
  /** Type-specific field: coverage / opportunity_type / status_label ('' for products). */
  detail: string;
  categoryName: string | null;
}

const DETAIL_COLUMN: Record<PublicContentType, string> = {
  products: '',
  services: 'coverage',
  projects: 'status_label',
  opportunities: 'opportunity_type',
};

export interface ContentSectionFilters {
  categorySlug?: string;
  coverage?: string;
  opportunityType?: string;
  companySlug?: string;
  search?: string;
}

function mapContentItem(row: Record<string, unknown>): PublicContentItem {
  const company = one(row.companies as Relation);
  const category = one(row.categories as Relation);
  const detailColumn = DETAIL_COLUMN[rowType(row)] ?? '';
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    createdAt: row.created_at as string,
    companyName: (company?.legal_name as string) ?? '',
    companySlug: (company?.slug as string) ?? '',
    detail: detailColumn ? ((row[detailColumn] as string) ?? '') : '',
    categoryName: (category?.name as string) ?? null,
  };
}

function rowType(row: Record<string, unknown>): PublicContentType {
  const type = row.__type as PublicContentType | undefined;
  return type ?? 'products';
}

async function fetchContent(
  client: SupabaseClient,
  type: PublicContentType,
  filters: ContentSectionFilters,
  companyId?: string,
): Promise<PublicContentItem[]> {
  const detailColumn = DETAIL_COLUMN[type];
  const needsCategoryInner = Boolean(filters.categorySlug);
  const needsCompanyInner = Boolean(filters.companySlug) || Boolean(companyId);
  const categoryPart = needsCategoryInner
    ? 'categories!inner(name, slug)'
    : 'categories(name, slug)';
  const companyPart = needsCompanyInner
    ? 'companies!inner(legal_name, slug)'
    : 'companies(legal_name, slug)';
  const columns = [
    'id, name, description, created_at',
    ...(detailColumn ? [detailColumn] : []),
    ...(type === 'products' || type === 'services' ? [categoryPart] : []),
    companyPart,
  ].join(', ');

  let query = client.from(type).select(columns).order('created_at', { ascending: false }).limit(60);
  if (filters.categorySlug) query = query.eq('categories.slug', filters.categorySlug);
  if (filters.coverage) query = query.eq('coverage', filters.coverage);
  if (filters.opportunityType) query = query.eq('opportunity_type', filters.opportunityType);
  if (companyId) query = query.eq('company_id', companyId);
  if (filters.companySlug) query = query.eq('companies.slug', filters.companySlug);
  const search = sanitizeSearch(filters.search);
  if (search.length > 0) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[listPublicContent]', type, error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map((row) => mapContentItem({ ...row, __type: type }));
}

export async function listPublicContent(
  client: SupabaseClient,
  type: PublicContentType,
  filters: ContentSectionFilters,
): Promise<PublicContentItem[]> {
  return fetchContent(client, type, filters);
}

export async function listCompanyPublishedContent(
  client: SupabaseClient,
  companyId: string,
): Promise<Record<PublicContentType, PublicContentItem[]>> {
  const [products, services, projects, opportunities] = await Promise.all([
    fetchContent(client, 'products', {}, companyId),
    fetchContent(client, 'services', {}, companyId),
    fetchContent(client, 'projects', {}, companyId),
    fetchContent(client, 'opportunities', {}, companyId),
  ]);
  return { products, services, projects, opportunities };
}

// ── gallery ───────────────────────────────────────────────────────────────────

export interface GalleryImage {
  url: string;
  alt: string | null;
}

export async function listCompanyGallery(
  client: SupabaseClient,
  companyId: string,
): Promise<GalleryImage[]> {
  const { data, error } = await client
    .from('images')
    .select('storage_path, alt')
    .eq('owner_type', 'company')
    .eq('owner_id', companyId)
    .order('position', { ascending: true })
    .limit(8);
  if (error) {
    console.error('[listCompanyGallery]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    url: mediaPublicUrl(client, row.storage_path as string),
    alt: (row.alt as string | null) ?? null,
  }));
}

// ── taxonomies & territory ────────────────────────────────────────────────────

export interface TaxonomyRef {
  id: string;
  slug: string;
  name: string;
}

export async function listActiveSectors(client: SupabaseClient): Promise<TaxonomyRef[]> {
  const { data, error } = await client
    .from('sectors')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(50);
  if (error) {
    console.error('[listActiveSectors]', error.message);
    return [];
  }
  return (data ?? []) as TaxonomyRef[];
}

export async function getSectorBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<TaxonomyRef | null> {
  const { data, error } = await client
    .from('sectors')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('[getSectorBySlug]', error.message);
    return null;
  }
  return data as TaxonomyRef;
}

export interface TerritoryRef {
  id: number;
  slug: string;
  name: string;
}

export interface MunicipalityRef extends TerritoryRef {
  provinceId: number;
}

export async function listProvinces(client: SupabaseClient): Promise<TerritoryRef[]> {
  const { data, error } = await client.from('provinces').select('id, slug, name').order('id');
  if (error) {
    console.error('[listProvinces]', error.message);
    return [];
  }
  return (data ?? []) as TerritoryRef[];
}

export async function listMunicipalities(
  client: SupabaseClient,
  provinceId?: number,
): Promise<MunicipalityRef[]> {
  let query = client.from('municipalities').select('id, slug, name, province_id').order('name');
  if (provinceId) query = query.eq('province_id', provinceId);
  const { data, error } = await query.limit(200);
  if (error) {
    console.error('[listMunicipalities]', error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    provinceId: row.province_id as number,
  }));
}

export async function getProvinceBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<TerritoryRef | null> {
  const { data, error } = await client
    .from('provinces')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('[getProvinceBySlug]', error.message);
    return null;
  }
  return data as TerritoryRef;
}

export async function getMunicipalityBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<MunicipalityRef | null> {
  const { data, error } = await client
    .from('municipalities')
    .select('id, slug, name, province_id')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error('[getMunicipalityBySlug]', error.message);
    return null;
  }
  const row = data as Record<string, unknown>;
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    provinceId: row.province_id as number,
  };
}

// ── home stats ────────────────────────────────────────────────────────────────

export interface HomeStats {
  companies: number;
  products: number;
  services: number;
  projects: number;
  opportunities: number;
}

async function publicCount(client: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select('id', { count: 'exact', head: true })
    .limit(1);
  if (error) {
    console.error('[publicCount]', table, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function getHomeStats(client: SupabaseClient): Promise<HomeStats> {
  const [companies, products, services, projects, opportunities] = await Promise.all([
    publicCount(client, 'companies'),
    publicCount(client, 'products'),
    publicCount(client, 'services'),
    publicCount(client, 'projects'),
    publicCount(client, 'opportunities'),
  ]);
  return { companies, products, services, projects, opportunities };
}

// ── viewer networking right (internal contact button gating) ──────────────────

export interface ViewerCompanyProfile {
  role: 'company' | 'admin';
  status?: string;
  entityType?: string;
  premiumUntil?: string | null;
}

export function computeNetworkingRight(profile: ViewerCompanyProfile | null): boolean {
  if (!profile || profile.role !== 'company' || profile.status !== 'approved') return false;
  if (profile.entityType === 'mipyme' || profile.entityType === 'cooperative') return true;
  if (profile.entityType === 'foreign') {
    return Boolean(profile.premiumUntil && new Date(profile.premiumUntil).getTime() > Date.now());
  }
  return false;
}
