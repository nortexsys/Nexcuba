import type { MetadataRoute } from 'next';
import { loadSitemapData, buildSitemapEntries, type SitemapData } from '@/lib/seo/sitemap';
import { safeQuery } from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';

/**
 * Public sitemap (H9 §9.2, design §7). Built from the same entity data the
 * pages render; sector/province/municipality routes only appear when populated
 * so crawlers never hit the thin-page 404 guard. Degrades to static routes
 * when Supabase is unavailable (CI/local without env).
 */
const EMPTY_DATA: SitemapData = {
  companySlugs: [],
  sectorSlugs: [],
  provinceSlugs: [],
  municipalities: [],
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await safeQuery(() => loadSitemapData(getPublicClient()), EMPTY_DATA);
  return buildSitemapEntries(data);
}
