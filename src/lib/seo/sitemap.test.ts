import { describe, expect, it } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { STATIC_ENTRIES, buildSitemapEntries, loadSitemapData, type SitemapData } from './sitemap';

const EMPTY: SitemapData = {
  companySlugs: [],
  sectorSlugs: [],
  provinceSlugs: [],
  municipalities: [],
};

describe('loadSitemapData', () => {
  it('collects approved company slugs', async () => {
    const { client } = makeSupabaseClient({
      companies: { rows: [{ slug: 'acme' }, { slug: 'cuba-solar' }, { slug: 'acme' }] },
    });
    const data = await loadSitemapData(client);
    expect(data.companySlugs).toEqual(['acme', 'cuba-solar']);
  });

  it('collects populated sector slugs through company_sectors', async () => {
    const { client } = makeSupabaseClient({
      company_sectors: {
        rows: [
          { sectors: { slug: 'energia' } },
          { sectors: [{ slug: 'tech' }] },
          { sectors: { slug: 'energia' } },
        ],
      },
    });
    const data = await loadSitemapData(client);
    expect(data.sectorSlugs).toEqual(['energia', 'tech']);
  });

  it('collects province slugs with approved companies', async () => {
    const { client } = makeSupabaseClient({
      companies: {
        rows: [
          { provinces: { slug: 'la-habana' } },
          { provinces: [{ slug: 'matanzas' }] },
          { provinces: null },
        ],
      },
    });
    const data = await loadSitemapData(client);
    expect(data.provinceSlugs).toEqual(['la-habana', 'matanzas']);
  });

  it('collects municipality slugs with their province slug', async () => {
    const { client } = makeSupabaseClient({
      companies: {
        rows: [
          { municipalities: { slug: 'centro-habana', provinces: { slug: 'la-habana' } } },
          { municipalities: { slug: 'plaza', provinces: { slug: 'la-habana' } } },
          { municipalities: null },
        ],
      },
    });
    const data = await loadSitemapData(client);
    expect(data.municipalities).toEqual([
      { slug: 'centro-habana', provinceSlug: 'la-habana' },
      { slug: 'plaza', provinceSlug: 'la-habana' },
    ]);
  });

  it('degrades to empty data when queries fail', async () => {
    const { client } = makeSupabaseClient({
      companies: { error: { message: 'down' } },
      company_sectors: { error: { message: 'down' } },
    });
    const data = await loadSitemapData(client);
    expect(data).toEqual(EMPTY);
  });
});

describe('buildSitemapEntries', () => {
  it('starts with the static routes', () => {
    const entries = buildSitemapEntries(EMPTY);
    expect(entries).toEqual(STATIC_ENTRIES);
    expect(entries[0]?.url).toBe('https://nexcuba.org');
    expect(entries[0]?.priority).toBe(1);
  });

  it('emits entity pages after the static block', () => {
    const entries = buildSitemapEntries({
      companySlugs: ['acme'],
      sectorSlugs: ['energia'],
      provinceSlugs: ['la-habana'],
      municipalities: [{ slug: 'centro-habana', provinceSlug: 'la-habana' }],
    });
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://nexcuba.org/empresas/acme');
    expect(urls).toContain('https://nexcuba.org/sectores/energia');
    expect(urls).toContain('https://nexcuba.org/p/la-habana');
    expect(urls).toContain('https://nexcuba.org/p/la-habana/centro-habana');
  });
});
