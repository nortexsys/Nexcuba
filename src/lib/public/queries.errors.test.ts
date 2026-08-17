import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  countPublicProductsByCompany,
  getFeaturedCompanies,
  getMunicipalityBySlug,
  getProvinceBySlug,
  getPublicCompanyBySlug,
  getSectorBySlug,
  listActiveSectors,
  listCompanyGallery,
  listMunicipalities,
  listProvinces,
  listPublicCompanies,
  listPublicContent,
} from '@/lib/public/queries';

const boom = { message: 'boom' };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('public queries error fallbacks (graceful pages)', () => {
  it('every lookup degrades to its empty shape', async () => {
    const failing = makeSupabaseClient({
      companies: { error: boom },
      images: { error: boom },
      sectors: { error: boom },
      provinces: { error: boom },
      municipalities: { error: boom },
      products: { error: boom },
    });

    expect(await getPublicCompanyBySlug(failing.client, 'x')).toBeNull();
    expect(await getFeaturedCompanies(failing.client)).toEqual([]);
    expect(await listPublicCompanies(failing.client, {})).toEqual([]);
    expect(await countPublicProductsByCompany(failing.client, ['c-1'])).toEqual(new Map());
    expect(await listCompanyGallery(failing.client, 'c-1')).toEqual([]);
    expect(await listActiveSectors(failing.client)).toEqual([]);
    expect(await getSectorBySlug(failing.client, 'x')).toBeNull();
    expect(await listProvinces(failing.client)).toEqual([]);
    expect(await listMunicipalities(failing.client)).toEqual([]);
    expect(await listMunicipalities(failing.client, 1)).toEqual([]);
    expect(await getProvinceBySlug(failing.client, 'x')).toBeNull();
    expect(await getMunicipalityBySlug(failing.client, 'x')).toBeNull();
    expect(await listPublicContent(failing.client, 'products', {})).toEqual([]);
  });

  it('handles array-shaped embeds in the ficha and content', async () => {
    const h = makeSupabaseClient({
      companies: {
        row: {
          id: 'c-1',
          slug: 'x',
          display_name: 'X',
          legal_name: 'X SL',
          entity_type: 'foreign',
          description: null,
          logo_path: null,
          phone: null,
          email: null,
          website: null,
          address: null,
          socials: [],
          created_at: '2026-01-01',
          municipalities: [{ name: 'La Habana' }],
          provinces: [{ name: 'La Habana' }],
          company_sectors: [{ sectors: [{ name: 'Turismo' }] }],
        },
      },
      products: {
        rows: [
          {
            id: 'p-1',
            name: 'P',
            description: null,
            created_at: '2026-01-01',
            categories: [{ name: 'Cat', slug: 'cat' }],
            companies: [{ legal_name: 'X SL', slug: 'x' }],
          },
        ],
      },
    });

    const detail = await getPublicCompanyBySlug(h.client, 'x');
    expect(detail?.municipalityName).toBe('La Habana');
    expect(detail?.sectorNames).toEqual(['Turismo']);
    expect(detail?.socials).toEqual([]);

    const rows = await listPublicContent(h.client, 'products', { search: 'p' });
    expect(rows[0]?.categoryName).toBe('Cat');
    expect(rows[0]?.companyName).toBe('X SL');
  });
});
