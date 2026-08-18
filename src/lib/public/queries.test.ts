import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  computeNetworkingRight,
  countPublicProductsByCompany,
  getFeaturedCompanies,
  getHomeStats,
  getPublicCompanyBySlug,
  getSectorBySlug,
  listActiveSectors,
  listCompanyGallery,
  listCompanyPublishedContent,
  listPublicCompanies,
  listPublicContent,
  mediaPublicUrl,
  parseSocials,
  safeQuery,
  searchAll,
} from '@/lib/public/queries';

const companyRow = {
  id: 'c-1',
  slug: 'cafe-de-altura',
  display_name: 'Café de Altura',
  legal_name: 'Café de Altura SRL',
  entity_type: 'mipyme',
  description: 'Tostamos café de altura.',
  logo_path: 'c-1/logo.jpg',
  phone: '+53 5 123 4567',
  email: 'hola@cafe.cu',
  website: 'https://cafe.cu',
  address: 'Calle 23 #45',
  socials: [
    { platform: 'instagram', url: 'https://instagram.com/cafe' },
    { platform: 'facebook', url: 'https://facebook.com/cafe' },
  ],
  municipality_id: 3,
  province_id: 1,
  created_at: '2026-01-15T00:00:00Z',
  municipalities: { name: 'Pinar del Río' },
  provinces: { name: 'Pinar del Río' },
  company_sectors: [{ sectors: { name: 'Café y Cacao', slug: 'cafe-y-cacao' } }],
};

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({ companies: { rows: [companyRow], row: companyRow } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listPublicCompanies (5.2 directorio + filtros §12.3)', () => {
  it('maps the card shape with territory, sectors and logo URL', async () => {
    const rows = await listPublicCompanies(h.client, {});
    expect(rows[0]).toMatchObject({
      id: 'c-1',
      slug: 'cafe-de-altura',
      name: 'Café de Altura',
      entityType: 'mipyme',
      municipalityName: 'Pinar del Río',
      provinceName: 'Pinar del Río',
      sectorNames: ['Café y Cacao'],
      logoUrl: 'https://media.example/media/c-1/logo.jpg',
    });
  });

  it('falls back to legal_name and empty sectors gracefully', async () => {
    h = makeSupabaseClient({
      companies: {
        rows: [
          {
            ...companyRow,
            display_name: null,
            company_sectors: null,
            municipalities: null,
            provinces: null,
            logo_path: null,
          },
        ],
      },
    });
    const rows = await listPublicCompanies(h.client, {});
    expect(rows[0]?.name).toBe('Café de Altura SRL');
    expect(rows[0]?.sectorNames).toEqual([]);
    expect(rows[0]?.logoUrl).toBeNull();
    expect(rows[0]?.municipalityName).toBeNull();
  });

  it('applies type/territory filters and a sanitized search', async () => {
    await listPublicCompanies(h.client, {
      entityType: 'mipyme',
      provinceId: 1,
      municipalityId: 3,
      search: 'Café, Grande',
    });
    const filters = h.calls.eqFilters['companies'];
    expect(filters).toContainEqual({ column: 'entity_type', value: 'mipyme' });
    expect(filters).toContainEqual({ column: 'province_id', value: 1 });
    expect(filters).toContainEqual({ column: 'municipality_id', value: 3 });
    // The search VALUE's commas are stripped so the PostgREST `or`
    // expression cannot break; the separator comma between fields remains.
    expect(h.calls.orFilters['companies']?.[0]).toContain('ilike.%Café  Grande%');
  });

  it('filters by sector slug through the embedded path', async () => {
    await listPublicCompanies(h.client, { sectorSlug: 'cafe-y-cacao' });
    expect(h.calls.eqFilters['companies']).toContainEqual({
      column: 'company_sectors.sectors.slug',
      value: 'cafe-y-cacao',
    });
    const select = h.calls.selectColumns['companies']?.[0] as string;
    expect(select).toContain('!inner');
  });

  it('returns [] on query errors (graceful degradation)', async () => {
    h = makeSupabaseClient({ companies: { error: { message: 'boom' } } });
    expect(await listPublicCompanies(h.client, {})).toEqual([]);
  });
});

describe('getPublicCompanyBySlug (5.3 ficha)', () => {
  it('returns the full ficha with parsed socials', async () => {
    const detail = await getPublicCompanyBySlug(h.client, 'cafe-de-altura');
    expect(detail?.phone).toBe('+53 5 123 4567');
    expect(detail?.socials).toEqual([
      { platform: 'instagram', url: 'https://instagram.com/cafe' },
      { platform: 'facebook', url: 'https://facebook.com/cafe' },
    ]);
    expect(detail?.logoUrl).toBe('https://media.example/media/c-1/logo.jpg');
  });

  it('returns null when the slug is unknown or invisible', async () => {
    h = makeSupabaseClient({ companies: { row: null } });
    expect(await getPublicCompanyBySlug(h.client, 'no-existe')).toBeNull();
  });
});

describe('parseSocials', () => {
  it('tolerates garbage payloads', () => {
    expect(parseSocials(null)).toEqual([]);
    expect(parseSocials('no-un-array')).toEqual([]);
    expect(parseSocials([{ plataforma: 'x' }, { platform: 'x', url: 5 }])).toEqual([]);
  });

  it('keeps valid platform/url pairs', () => {
    expect(parseSocials([{ platform: 'x', url: 'https://x.cu' }])).toEqual([
      { platform: 'x', url: 'https://x.cu' },
    ]);
  });
});

describe('mediaPublicUrl', () => {
  it('builds the public URL from the media bucket', () => {
    expect(mediaPublicUrl(h.client, 'c-1/logo.jpg')).toBe(
      'https://media.example/media/c-1/logo.jpg',
    );
  });
});

describe('listCompanyGallery (5.3 galería)', () => {
  it('maps storage paths to public URLs ordered by position', async () => {
    h = makeSupabaseClient({
      images: {
        rows: [
          { storage_path: 'c-1/company/g1.jpg', alt: 'Local', position: 1 },
          { storage_path: 'c-1/company/g2.jpg', alt: null, position: 2 },
        ],
      },
    });
    const gallery = await listCompanyGallery(h.client, 'c-1');
    expect(gallery).toEqual([
      { url: 'https://media.example/media/c-1/company/g1.jpg', alt: 'Local' },
      { url: 'https://media.example/media/c-1/company/g2.jpg', alt: null },
    ]);
    expect(h.calls.eqFilters['images']).toContainEqual({ column: 'owner_type', value: 'company' });
  });
});

describe('listPublicContent (5.4 secciones)', () => {
  it('maps products with category and company attribution', async () => {
    h = makeSupabaseClient({
      products: {
        rows: [
          {
            id: 'p-1',
            name: 'Café molido',
            description: '500 g',
            created_at: '2026-02-01T00:00:00Z',
            categories: { name: 'Alimentos', slug: 'alimentos' },
            companies: { legal_name: 'Café de Altura SRL', slug: 'cafe-de-altura' },
          },
        ],
      },
    });
    const rows = await listPublicContent(h.client, 'products', {});
    expect(rows[0]).toMatchObject({
      id: 'p-1',
      name: 'Café molido',
      companyName: 'Café de Altura SRL',
      companySlug: 'cafe-de-altura',
      categoryName: 'Alimentos',
      detail: '',
    });
  });

  it('exposes the type-specific detail field', async () => {
    h = makeSupabaseClient({
      services: {
        rows: [
          {
            id: 's-1',
            name: 'S',
            created_at: '2026-01-01',
            coverage: 'national',
            companies: { legal_name: 'X', slug: 'x' },
          },
        ],
      },
      opportunities: {
        rows: [
          {
            id: 'o-1',
            name: 'O',
            created_at: '2026-01-01',
            opportunity_type: 'financiacion',
            companies: { legal_name: 'X', slug: 'x' },
          },
        ],
      },
      projects: {
        rows: [
          {
            id: 'pr-1',
            name: 'P',
            created_at: '2026-01-01',
            status_label: 'En ejecución',
            companies: { legal_name: 'X', slug: 'x' },
          },
        ],
      },
    });
    expect((await listPublicContent(h.client, 'services', {}))[0]?.detail).toBe('national');
    expect((await listPublicContent(h.client, 'opportunities', {}))[0]?.detail).toBe(
      'financiacion',
    );
    expect((await listPublicContent(h.client, 'projects', {}))[0]?.detail).toBe('En ejecución');
  });

  it('applies section filters', async () => {
    h = makeSupabaseClient({ products: { rows: [] } });
    await listPublicContent(h.client, 'products', {
      categorySlug: 'alimentos',
      search: 'café',
      companySlug: 'cafe-de-altura',
    });
    const filters = h.calls.eqFilters['products'];
    expect(filters).toContainEqual({ column: 'categories.slug', value: 'alimentos' });
    expect(filters).toContainEqual({ column: 'companies.slug', value: 'cafe-de-altura' });
    expect(h.calls.selectColumns['products']?.[0]).toMatch(/!inner/);
  });

  it('applies coverage and opportunity-type filters on their sections', async () => {
    h = makeSupabaseClient({ services: { rows: [] }, opportunities: { rows: [] } });
    await listPublicContent(h.client, 'services', { coverage: 'national' });
    await listPublicContent(h.client, 'opportunities', { opportunityType: 'socio' });
    expect(h.calls.eqFilters['services']).toContainEqual({ column: 'coverage', value: 'national' });
    expect(h.calls.eqFilters['opportunities']).toContainEqual({
      column: 'opportunity_type',
      value: 'socio',
    });
  });
});

describe('listCompanyPublishedContent (5.3 ficha)', () => {
  it('queries the four content tables for the company', async () => {
    const result = await listCompanyPublishedContent(h.client, 'c-1');
    expect(result).toEqual({
      products: [],
      services: [],
      projects: [],
      opportunities: [],
    });
    for (const table of ['products', 'services', 'projects', 'opportunities']) {
      expect(h.calls.eqFilters[table]).toContainEqual({ column: 'company_id', value: 'c-1' });
    }
  });
});

describe('getFeaturedCompanies (5.1 destacadas)', () => {
  it('filters is_featured', async () => {
    await getFeaturedCompanies(h.client);
    expect(h.calls.eqFilters['companies']).toContainEqual({ column: 'is_featured', value: true });
  });
});

describe('taxonomies + territory lookups (5.5)', () => {
  it('lists active sectors and finds one by slug', async () => {
    h = makeSupabaseClient({
      sectors: {
        rows: [{ id: 's-1', slug: 'cafe-y-cacao', name: 'Café y Cacao' }],
        row: { id: 's-1', slug: 'cafe-y-cacao', name: 'Café y Cacao' },
      },
    });
    expect((await listActiveSectors(h.client))[0]?.slug).toBe('cafe-y-cacao');
    expect((await getSectorBySlug(h.client, 'cafe-y-cacao'))?.name).toBe('Café y Cacao');
    h = makeSupabaseClient({ sectors: { row: null } });
    expect(await getSectorBySlug(h.client, 'no-existe')).toBeNull();
  });

  it('looks up provinces and municipalities by slug', async () => {
    h = makeSupabaseClient({
      provinces: { row: { id: 1, slug: 'pinar-del-rio', name: 'Pinar del Río' } },
      municipalities: {
        row: { id: 3, slug: 'consolacion-del-sur', name: 'Consolación del Sur', province_id: 1 },
      },
    });
    const queries = await import('@/lib/public/queries');
    expect((await queries.getProvinceBySlug(h.client, 'pinar-del-rio'))?.name).toBe(
      'Pinar del Río',
    );
    expect((await queries.getMunicipalityBySlug(h.client, 'consolacion-del-sur'))?.name).toBe(
      'Consolación del Sur',
    );
    const empty = makeSupabaseClient({ provinces: { row: null } });
    expect(await queries.getProvinceBySlug(empty.client, 'la-habana-este')).toBeNull();
  });

  it('lists provinces and municipalities for the filters', async () => {
    h = makeSupabaseClient({
      provinces: { rows: [{ id: 1, slug: 'pinar-del-rio', name: 'Pinar del Río' }] },
      municipalities: { rows: [{ id: 3, slug: 'pinar', name: 'Pinar del Río', province_id: 1 }] },
    });
    const queries = await import('@/lib/public/queries');
    expect((await queries.listProvinces(h.client)).length).toBe(1);
    await queries.listMunicipalities(h.client, 1);
    expect(h.calls.eqFilters['municipalities']).toContainEqual({ column: 'province_id', value: 1 });
  });
});

describe('getHomeStats (5.1 banda de estadísticas)', () => {
  it('collects the five public counters', async () => {
    h = makeSupabaseClient({
      companies: { count: 42 },
      products: { count: 10 },
      services: { count: 7 },
      projects: { count: 3 },
      opportunities: { count: 5 },
    });
    const stats = await getHomeStats(h.client);
    expect(stats).toEqual({
      companies: 42,
      products: 10,
      services: 7,
      projects: 3,
      opportunities: 5,
    });
  });

  it('degrades to zeros on errors', async () => {
    h = makeSupabaseClient({ companies: { error: { message: 'boom' } } });
    const stats = await getHomeStats(h.client);
    expect(stats.companies).toBe(0);
  });
});

describe('countPublicProductsByCompany (cards stat)', () => {
  it('aggregates counts per company id', async () => {
    h = makeSupabaseClient({
      products: { rows: [{ company_id: 'c-1' }, { company_id: 'c-1' }, { company_id: 'c-2' }] },
    });
    const counts = await countPublicProductsByCompany(h.client, ['c-1', 'c-2']);
    expect(counts.get('c-1')).toBe(2);
    expect(counts.get('c-2')).toBe(1);
  });

  it('skips the query for empty id lists', async () => {
    const counts = await countPublicProductsByCompany(h.client, []);
    expect(counts.size).toBe(0);
    expect(h.calls.selectColumns['products']).toBeUndefined();
  });
});

describe('computeNetworkingRight (contacto interno gating)', () => {
  const base = { role: 'company' as const, status: 'approved' as const };
  it('grants cuban approved companies', () => {
    expect(computeNetworkingRight({ ...base, entityType: 'mipyme' })).toBe(true);
    expect(computeNetworkingRight({ ...base, entityType: 'cooperative' })).toBe(true);
  });
  it('grants foreign only with active premium', () => {
    expect(computeNetworkingRight({ ...base, entityType: 'foreign' })).toBe(false);
    expect(
      computeNetworkingRight({ ...base, entityType: 'foreign', premiumUntil: '2000-01-01' }),
    ).toBe(false);
    expect(
      computeNetworkingRight({ ...base, entityType: 'foreign', premiumUntil: '2999-01-01' }),
    ).toBe(true);
  });
  it('denies non-approved, admins and anonymous', () => {
    expect(
      computeNetworkingRight({ role: 'company', entityType: 'mipyme', status: 'pending' }),
    ).toBe(false);
    expect(computeNetworkingRight({ role: 'admin' })).toBe(false);
    expect(computeNetworkingRight(null)).toBe(false);
  });
});

describe('searchAll (7.2 buscador global → RPC search_all)', () => {
  const searchRows = [
    {
      entity: 'company',
      id: 'c-1',
      title: 'Café de Altura',
      description: 'Tostamos café de altura.',
      company_id: 'c-1',
      company_name: 'Café de Altura',
      company_slug: 'cafe-de-altura',
      rank: 0.9,
      created_at: '2026-01-15T00:00:00Z',
    },
    {
      entity: 'product',
      id: 'p-1',
      title: 'Café molido',
      description: '500 g',
      company_id: 'c-1',
      company_name: 'Café de Altura',
      company_slug: 'cafe-de-altura',
      rank: 0.8,
      created_at: '2026-02-01T00:00:00Z',
    },
    {
      entity: 'product',
      id: 'p-2',
      title: 'Café en grano',
      description: 'Origen Yaguajay',
      company_id: 'c-2',
      company_name: 'Café del Centro',
      company_slug: 'cafe-del-centro',
      rank: 0.6,
      created_at: '2026-03-01T00:00:00Z',
    },
  ];

  it('groups RPC rows by entity preserving relevance order', async () => {
    h = makeSupabaseClient({}, { search_all: { data: searchRows, error: null } });
    const groups = await searchAll(h.client, 'café');
    expect(groups.map((group) => group.entity)).toEqual(['company', 'product']);
    expect(groups[1]?.items.map((row) => row.id)).toEqual(['p-1', 'p-2']);
    expect(h.calls.rpc).toHaveBeenCalledWith('search_all', { query: 'café' });
  });

  it('passes the trimmed term and skips the RPC for an empty query', async () => {
    h = makeSupabaseClient({}, { search_all: { data: searchRows, error: null } });
    expect(await searchAll(h.client, '   ')).toEqual([]);
    expect(await searchAll(h.client, '')).toEqual([]);
    expect(h.calls.rpc).not.toHaveBeenCalled();
  });

  it('returns [] on RPC errors (graceful degradation)', async () => {
    h = makeSupabaseClient({}, { search_all: { data: null, error: { message: 'boom' } } });
    expect(await searchAll(h.client, 'café')).toEqual([]);
  });

  it('returns [] when the RPC yields no rows', async () => {
    h = makeSupabaseClient({}, { search_all: { data: [], error: null } });
    expect(await searchAll(h.client, 'inexistente')).toEqual([]);
  });
});

describe('safeQuery (CI without env → graceful pages)', () => {
  it('returns the fallback when the fetcher throws', async () => {
    const result = await safeQuery(() => {
      throw new Error('env missing');
    }, [] as number[]);
    expect(result).toEqual([]);
  });

  it('passes the value through on success', async () => {
    expect(await safeQuery(async () => 7, 0)).toBe(7);
  });
});
