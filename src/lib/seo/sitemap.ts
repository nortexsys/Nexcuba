import type { SupabaseClient } from '@supabase/supabase-js';
import { absoluteUrl } from './site';

/**
 * Sitemap data layer (H9 §9.2, design §7). Only indexable, non-thin pages are
 * emitted: sector/province/municipality routes appear exclusively when at
 * least one approved company populates them (the same rule the pages enforce
 * at runtime with their 404 guard).
 */

export type SitemapChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: SitemapChangeFrequency;
  priority?: number;
}

export interface SitemapData {
  companySlugs: string[];
  sectorSlugs: string[];
  provinceSlugs: string[];
  municipalities: { slug: string; provinceSlug: string }[];
}

export const STATIC_ENTRIES: SitemapEntry[] = [
  { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
  { url: absoluteUrl('/empresas'), changeFrequency: 'daily', priority: 0.9 },
  { url: absoluteUrl('/productos'), changeFrequency: 'weekly', priority: 0.7 },
  { url: absoluteUrl('/servicios'), changeFrequency: 'weekly', priority: 0.7 },
  { url: absoluteUrl('/proyectos'), changeFrequency: 'weekly', priority: 0.7 },
  { url: absoluteUrl('/oportunidades'), changeFrequency: 'weekly', priority: 0.7 },
  { url: absoluteUrl('/registro'), changeFrequency: 'monthly', priority: 0.5 },
  { url: absoluteUrl('/registro/extranjera'), changeFrequency: 'monthly', priority: 0.5 },
  { url: absoluteUrl('/acceso'), changeFrequency: 'monthly', priority: 0.3 },
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function extractSingleLink(row: unknown): Record<string, unknown> | null {
  if (Array.isArray(row)) return (row[0] as Record<string, unknown>) ?? null;
  return (row as Record<string, unknown>) ?? null;
}

/** Slugs of every approved company ficha. */
async function fetchApprovedCompanySlugs(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('companies').select('slug').eq('status', 'approved');
  if (error || !data) return [];
  return unique((data as { slug: string }[]).map((row) => row.slug));
}

/** Sector slugs that have at least one approved company. */
async function fetchPopulatedSectorSlugs(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from('company_sectors')
    .select('sectors!inner(slug)')
    .eq('companies(status)', 'approved');
  if (error || !data) return [];
  return unique(
    (data as { sectors: unknown }[])
      .map((row) => {
        const sector = extractSingleLink(row.sectors);
        return (sector?.slug as string | undefined) ?? '';
      })
      .filter(Boolean),
  );
}

/** Province slugs with at least one approved company. */
async function fetchPopulatedProvinceSlugs(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from('companies')
    .select('provinces!inner(slug)')
    .eq('status', 'approved');
  if (error || !data) return [];
  return unique(
    (data as { provinces: unknown }[])
      .map((row) => {
        const province = extractSingleLink(row.provinces);
        return (province?.slug as string | undefined) ?? '';
      })
      .filter(Boolean),
  );
}

/** Municipality slugs (with their province slug) that have approved companies. */
async function fetchPopulatedMunicipalities(
  client: SupabaseClient,
): Promise<SitemapData['municipalities']> {
  const { data, error } = await client
    .from('companies')
    .select('municipalities!inner(slug, provinces(slug))')
    .eq('status', 'approved');
  if (error || !data) return [];
  const seen = new Set<string>();
  const result: SitemapData['municipalities'] = [];
  for (const row of data as { municipalities: unknown }[]) {
    const municipality = extractSingleLink(row.municipalities);
    const slug = municipality?.slug as string | undefined;
    const province = extractSingleLink(municipality?.provinces);
    const provinceSlug = province?.slug as string | undefined;
    if (!slug || !provinceSlug || seen.has(slug)) continue;
    seen.add(slug);
    result.push({ slug, provinceSlug });
  }
  return result;
}

/** Fetch every indexable entity URL slug, degrading to empty on errors. */
export async function loadSitemapData(client: SupabaseClient): Promise<SitemapData> {
  const [companySlugs, sectorSlugs, provinceSlugs, municipalities] = await Promise.all([
    fetchApprovedCompanySlugs(client),
    fetchPopulatedSectorSlugs(client),
    fetchPopulatedProvinceSlugs(client),
    fetchPopulatedMunicipalities(client),
  ]);
  return { companySlugs, sectorSlugs, provinceSlugs, municipalities };
}

/** Combine static routes with the entity pages into a full sitemap. */
export function buildSitemapEntries(data: SitemapData): SitemapEntry[] {
  const companies = data.companySlugs.map<SitemapEntry>((slug) => ({
    url: absoluteUrl(`/empresas/${slug}`),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  const sectors = data.sectorSlugs.map<SitemapEntry>((slug) => ({
    url: absoluteUrl(`/sectores/${slug}`),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
  const provinces = data.provinceSlugs.map<SitemapEntry>((slug) => ({
    url: absoluteUrl(`/p/${slug}`),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
  const municipalities = data.municipalities.map<SitemapEntry>(({ slug, provinceSlug }) => ({
    url: absoluteUrl(`/p/${provinceSlug}/${slug}`),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));
  return [...STATIC_ENTRIES, ...companies, ...sectors, ...provinces, ...municipalities];
}
