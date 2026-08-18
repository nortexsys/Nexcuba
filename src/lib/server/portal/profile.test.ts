import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getOwnProfile, setOwnSectors, updateOwnProfile } from '@/lib/server/portal/profile';

const profileRow = {
  role: 'company',
  company_id: 'c-1',
  companies: {
    id: 'c-1',
    slug: 'portal-sl',
    legal_name: 'Portal SL',
    display_name: 'Portal',
    description: 'Desc',
    phone: '+53 5 000 0000',
    email: 'hola@portal.cu',
    website: 'https://portal.cu',
    address: 'Calle 1',
    province_id: 1,
    municipality_id: 3,
    socials: [{ platform: 'instagram', url: 'https://instagram.com/portal' }],
    entity_type: 'mipyme',
    status: 'approved',
    premium_until: null,
    profile_completeness: 65,
  },
  company_sectors: [{ sector_id: 's-1' }, { sector_id: 's-2' }],
};

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    profiles: { row: profileRow },
    companies: { row: profileRow.companies, rows: [] },
    company_sectors: { rows: [] },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getOwnProfile (6.2)', () => {
  it('maps the profile with sectors and parsed socials', async () => {
    const profile = await getOwnProfile(h.client);
    expect(profile).toMatchObject({
      companyId: 'c-1',
      slug: 'portal-sl',
      displayName: 'Portal',
      completeness: 65,
      sectorIds: ['s-1', 's-2'],
      entityType: 'mipyme',
    });
    expect(profile?.socials).toEqual([
      { platform: 'instagram', url: 'https://instagram.com/portal' },
    ]);
  });

  it('returns null without a profile row', async () => {
    h = makeSupabaseClient({ profiles: { row: null } });
    expect(await getOwnProfile(h.client)).toBeNull();
  });
});

describe('updateOwnProfile (6.2: reflejo inmediato vía trigger 0010)', () => {
  const patch = {
    displayName: 'Portal Renovado',
    description: 'Nueva descripción',
    phone: '+53 5 111 1111',
    website: 'https://nuevo.portal.cu',
    address: 'Calle 2',
    socials: [{ platform: 'facebook', url: 'https://facebook.com/portal' }],
  };

  it('updates only non-privileged columns', async () => {
    const result = await updateOwnProfile(h.client, 'c-1', patch);
    expect(result).toEqual({ ok: true });
    const update = h.calls.updates['companies']?.[0];
    expect(update).toMatchObject({
      display_name: 'Portal Renovado',
      phone: '+53 5 111 1111',
      socials: [{ platform: 'facebook', url: 'https://facebook.com/portal' }],
    });
    expect(update).not.toHaveProperty('status');
    expect(update).not.toHaveProperty('entity_type');
    expect(update).not.toHaveProperty('premium_until');
  });

  it('validates socials shape and count', async () => {
    const badUrl = await updateOwnProfile(h.client, 'c-1', {
      ...patch,
      socials: [{ platform: 'x', url: 'no-url' }],
    });
    expect(badUrl.ok).toBe(false);
    if (!badUrl.ok) expect(badUrl.message).toContain('red social');

    const tooMany = await updateOwnProfile(h.client, 'c-1', {
      ...patch,
      socials: Array.from({ length: 5 }, (_, i) => ({
        platform: `p${i}`,
        url: `https://p${i}.cu`,
      })),
    });
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.message).toContain('máximo 4');
  });

  it('rejects an invalid website', async () => {
    const result = await updateOwnProfile(h.client, 'c-1', { ...patch, website: 'ftp://x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('página web');
  });

  it('maps municipality/province FK violations to a friendly message', async () => {
    h = makeSupabaseClient({
      profiles: { row: profileRow },
      companies: {
        row: profileRow.companies,
        mutationError: {
          message: 'violates foreign key constraint "companies_municipality_id_fkey"',
        },
      },
    });
    const result = await updateOwnProfile(h.client, 'c-1', {
      ...patch,
      provinceId: 2,
      municipalityId: 99,
    });
    expect(result).toEqual({ ok: false, message: 'El municipio no pertenece a la provincia.' });
  });

  it('answers the generic error on unexpected failures', async () => {
    h = makeSupabaseClient({ companies: { mutationError: { message: 'boom' } } });
    const result = await updateOwnProfile(h.client, 'c-1', patch);
    expect(result.ok).toBe(false);
  });
});

describe('setOwnSectors (6.2)', () => {
  it('replaces all sector links', async () => {
    const result = await setOwnSectors(h.client, 'c-1', ['s-3', 's-4']);
    expect(result).toEqual({ ok: true });
    expect(h.calls.deletes['company_sectors']).toContain('c-1');
    const inserts = h.calls.inserts['company_sectors']?.[0];
    expect(inserts).toMatchObject([
      { company_id: 'c-1', sector_id: 's-3' },
      { company_id: 'c-1', sector_id: 's-4' },
    ]);
  });

  it('rejects more than five sectors', async () => {
    const result = await setOwnSectors(h.client, 'c-1', ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('máximo 5');
  });

  it('allows clearing the sectors', async () => {
    const result = await setOwnSectors(h.client, 'c-1', []);
    expect(result).toEqual({ ok: true });
  });
});
