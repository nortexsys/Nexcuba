import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getPortalDashboard } from '@/lib/server/portal/dashboard';
import { getOwnProfile, setOwnSectors, updateOwnProfile } from '@/lib/server/portal/profile';
import {
  addOwnGalleryImage,
  listOwnGalleryImages,
  removeOwnGalleryImage,
} from '@/lib/server/portal/gallery';
import {
  addOwnContentImage,
  createOwnContent,
  deleteOwnContent,
  listOwnContent,
  removeOwnContentImage,
  updateOwnContent,
} from '@/lib/server/portal/content';

const boom = { message: 'boom' };
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 'J'.charCodeAt(0)]);

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('dashboard: defensive fallbacks (6.1)', () => {
  it('handles relation shapes, missing company and missing id', async () => {
    const base = (companies: unknown) => ({ role: 'company', company_id: 'c-1', companies });

    const arrayShape = makeSupabaseClient({
      profiles: {
        row: base([
          {
            entity_type: 'mipyme',
            status: 'approved',
            premium_until: null,
            profile_completeness: 55,
          },
        ]),
      },
    });
    const arr = await getPortalDashboard(arrayShape.client);
    expect(arr?.completeness).toBe(55);

    const emptyRelation = makeSupabaseClient({
      profiles: { row: { role: 'company', company_id: 'c-1', companies: [] } },
    });
    expect(await getPortalDashboard(emptyRelation.client)).toMatchObject({
      completeness: 0,
      canPublish: false,
      isForeignFree: false,
    });

    const noCompany = makeSupabaseClient({
      profiles: { row: { role: 'company', company_id: 'c-1', companies: null } },
    });
    expect(await getPortalDashboard(noCompany.client)).toMatchObject({ completeness: 0 });

    const noId = makeSupabaseClient({ profiles: { row: { role: 'company', company_id: null } } });
    expect(await getPortalDashboard(noId.client)).toBeNull();
  });

  it('returns null on profile query failure', async () => {
    h = makeSupabaseClient({ profiles: { error: boom } });
    expect(await getPortalDashboard(h.client)).toBeNull();
  });

  it('falls back to zero when counts are null (no error)', async () => {
    h = makeSupabaseClient({
      profiles: {
        row: {
          role: 'company',
          company_id: 'c-1',
          companies: {
            entity_type: 'mipyme',
            status: 'approved',
            premium_until: null,
            profile_completeness: 10,
          },
        },
      },
      products: { rows: [] },
      services: { rows: [] },
      projects: { rows: [] },
      opportunities: { rows: [] },
      contact_requests: { rows: [] },
    });
    const dashboard = await getPortalDashboard(h.client);
    expect(dashboard?.counts).toEqual({ products: 0, services: 0, projects: 0, opportunities: 0 });
    expect(dashboard?.pendingRequests).toBe(0);
    expect(dashboard?.establishedContacts).toBe(0);
  });
});

describe('profile: defensive fallbacks (6.2)', () => {
  const companies = {
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
    socials: null,
    entity_type: 'mipyme',
    status: 'approved',
    premium_until: null,
    profile_completeness: 65,
  };

  it('maps relation arrays and missing companies', async () => {
    const arrayShape = makeSupabaseClient({
      profiles: {
        row: {
          role: 'company',
          company_id: 'c-1',
          companies: [companies],
          company_sectors: [{ sector_id: 's-1' }],
        },
      },
    });
    const profile = await getOwnProfile(arrayShape.client);
    expect(profile?.legalName).toBe('Portal SL');
    expect(profile?.sectorIds).toEqual(['s-1']);

    const nullCompany = makeSupabaseClient({
      profiles: {
        row: { role: 'company', company_id: 'c-1', companies: null, company_sectors: null },
      },
    });
    const sparse = await getOwnProfile(nullCompany.client);
    expect(sparse).toMatchObject({
      companyId: 'c-1',
      slug: '',
      legalName: '',
      entityType: '',
      status: '',
      completeness: 0,
      sectorIds: [],
      socials: [],
    });
  });

  it('returns null on profile query failure', async () => {
    h = makeSupabaseClient({ profiles: { error: boom } });
    expect(await getOwnProfile(h.client)).toBeNull();
  });

  it('rejects a social with an empty platform', async () => {
    h = makeSupabaseClient({ companies: { row: companies } });
    const result = await updateOwnProfile(h.client, 'c-1', {
      socials: [{ platform: '   ', url: 'https://x.cu' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('red social');
  });

  it('stores null website for empty or null values', async () => {
    h = makeSupabaseClient({ companies: { row: companies } });
    const empty = await updateOwnProfile(h.client, 'c-1', { website: '' });
    expect(empty).toEqual({ ok: true });
    expect(h.calls.updates['companies']?.[0]?.website).toBeNull();
    const nul = await updateOwnProfile(h.client, 'c-1', { website: null });
    expect(nul).toEqual({ ok: true });
    expect(h.calls.updates['companies']?.[1]?.website).toBeNull();
  });

  it('reports sector delete and insert failures', async () => {
    const deleteFail = makeSupabaseClient({ company_sectors: { deleteError: boom } });
    expect(await setOwnSectors(deleteFail.client, 'c-1', ['s-1'])).toEqual({
      ok: false,
      message: 'No se pudieron guardar los sectores.',
    });

    const insertFail = makeSupabaseClient({ company_sectors: { insertError: boom } });
    expect(await setOwnSectors(insertFail.client, 'c-1', ['s-1'])).toEqual({
      ok: false,
      message: 'No se pudieron guardar los sectores.',
    });
  });
});

describe('gallery: defensive fallbacks (6.2)', () => {
  it('returns [] on list failure and maps null alt', async () => {
    h = makeSupabaseClient({ images: { error: boom } });
    expect(await listOwnGalleryImages(h.client, 'c-1')).toEqual([]);

    h = makeSupabaseClient({
      images: { rows: [{ id: 'i-1', storage_path: 'c-1/company/a.jpg', alt: null }] },
    });
    const rows = await listOwnGalleryImages(h.client, 'c-1');
    expect(rows[0]).toEqual({
      id: 'i-1',
      url: 'https://media.example/media/c-1/company/a.jpg',
      alt: null,
    });
  });

  it('survives count failures on add', async () => {
    h = makeSupabaseClient({ images: { error: boom } });
    const result = await addOwnGalleryImage(h.client, 'c-1', { name: 'foto.jpg', bytes: jpeg });
    expect(result.ok).toBe(false);
  });

  it('reports storage upload failures', async () => {
    h = makeSupabaseClient({}, {}, { uploadError: boom });
    const result = await addOwnGalleryImage(h.client, 'c-1', { name: 'foto.jpg', bytes: jpeg });
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo subir la imagen. Inténtalo de nuevo.',
    });
  });

  it('rolls back the storage object when the row insert fails', async () => {
    h = makeSupabaseClient({ images: { insertError: boom } }, {}, { removeError: boom });
    const result = await addOwnGalleryImage(h.client, 'c-1', { name: 'foto.jpg', bytes: jpeg });
    expect(result.ok).toBe(false);
    expect(h.calls.storageRemovals['media']).toHaveLength(1);
  });

  it('reports fetch, storage and delete failures on remove', async () => {
    h = makeSupabaseClient({ images: { error: boom } });
    expect(await removeOwnGalleryImage(h.client, 'c-1', 'i-1')).toEqual({
      ok: false,
      message: 'Imagen no encontrada.',
    });

    h = makeSupabaseClient(
      { images: { row: { id: 'i-1', storage_path: 'c-1/company/a.jpg' } } },
      {},
      { removeError: boom },
    );
    expect(await removeOwnGalleryImage(h.client, 'c-1', 'i-1')).toEqual({ ok: true });

    h = makeSupabaseClient({
      images: { row: { id: 'i-1', storage_path: 'c-1/company/a.jpg' }, deleteError: boom },
    });
    expect(await removeOwnGalleryImage(h.client, 'c-1', 'i-1')).toEqual({
      ok: false,
      message: 'No se pudo eliminar la imagen. Inténtalo de nuevo.',
    });
  });
});

describe('content: defensive fallbacks (6.3)', () => {
  const companyRow = { entity_type: 'mipyme', status: 'approved', premium_until: null };

  function happyHarness() {
    return makeSupabaseClient({
      companies: { row: companyRow },
      products: { rows: [], row: null },
      services: { rows: [], row: null },
      projects: { rows: [], row: null },
      opportunities: { rows: [], row: null },
      tags: { rows: [], row: null },
      content_tags: { rows: [], row: null },
      images: { rows: [], row: null },
    });
  }

  it('list: tolerates relation arrays, null tags and side-query errors', async () => {
    h = makeSupabaseClient({
      products: {
        rows: [{ id: 'p-1', name: 'Miel', description: null, category_id: null, created_at: null }],
      },
      content_tags: { rows: [{ content_id: 'p-1', tags: [{ name: 'Cacao' }] }] },
      images: { error: boom },
    });
    const items = await listOwnContent(h.client, 'c-1', 'products');
    expect(items[0]).toMatchObject({
      description: null,
      categoryId: null,
      createdAt: '',
      tagNames: ['Cacao'],
      images: [],
    });

    h = makeSupabaseClient({
      projects: {
        rows: [
          {
            id: 'pr-1',
            name: 'Planta',
            description: null,
            status_label: null,
            needs: null,
            location: null,
            created_at: null,
          },
        ],
      },
      content_tags: { error: boom },
    });
    const projects = await listOwnContent(h.client, 'c-1', 'projects');
    expect(projects[0]?.statusLabel).toBeNull();
    expect(projects[0]?.tagNames).toEqual([]);

    h = makeSupabaseClient({
      opportunities: {
        rows: [
          { id: 'o-1', name: 'Opp', description: null, opportunity_type: null, created_at: null },
        ],
      },
      content_tags: { rows: [{ content_id: 'o-1', tags: null }] },
    });
    const opps = await listOwnContent(h.client, 'c-1', 'opportunities');
    expect(opps[0]?.opportunityType).toBeNull();
    expect(opps[0]?.tagNames).toEqual([]);
  });

  it('create: validates description length and stores empty/normalized tags', async () => {
    h = happyHarness();
    const long = await createOwnContent(h.client, 'c-1', 'products', {
      name: 'Nombre',
      description: 'a'.repeat(2001),
    });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.message).toContain('2000');

    h = happyHarness();
    const trimmed = await createOwnContent(h.client, 'c-1', 'products', {
      name: 'Nuevo',
      description: '   ',
      tags: ['  Café  ', '', 'Café'],
    });
    expect(trimmed).toEqual({ ok: true, id: 'products-gen-1' });
    expect(h.calls.inserts['products']?.[0]?.description).toBeNull();
    expect(h.calls.inserts['tags']?.[0]).toMatchObject({ name: 'Café' });
  });

  it('create: maps projects columns and generic coverage handling', async () => {
    h = happyHarness();
    await createOwnContent(h.client, 'c-1', 'projects', {
      name: 'Proyecto',
      statusLabel: 'en marcha',
      needs: 'socios',
      location: 'La Habana',
      tags: undefined,
    });
    expect(h.calls.inserts['projects']?.[0]).toMatchObject({
      status_label: 'en marcha',
      needs: 'socios',
      location: 'La Habana',
    });
    expect(h.calls.inserts['content_tags']).toBeUndefined();

    h = happyHarness();
    await createOwnContent(h.client, 'c-1', 'services', {
      name: 'Servicio',
      categoryId: 'cat-1',
      coverage: 'local',
    });
    expect(h.calls.inserts['services']?.[0]).toMatchObject({
      category_id: 'cat-1',
      coverage: 'local',
    });
  });

  it('create: tag lookup, create and link failures surface friendly messages', async () => {
    const lookupFail = makeSupabaseClient({
      companies: { row: companyRow },
      tags: { error: boom },
    });
    const lookup = await createOwnContent(lookupFail.client, 'c-1', 'products', {
      name: 'Nuevo',
      tags: ['Cacao'],
    });
    expect(lookup.ok).toBe(false);
    if (!lookup.ok) expect(lookup.message).toContain('etiquetas');

    const createFail = makeSupabaseClient({
      companies: { row: companyRow },
      tags: { rows: [], insertError: boom },
    });
    const created = await createOwnContent(createFail.client, 'c-1', 'products', {
      name: 'Nuevo',
      tags: ['Cacao'],
    });
    expect(created.ok).toBe(false);

    const linkFail = makeSupabaseClient({
      companies: { row: companyRow },
      content_tags: { insertError: boom },
    });
    const linked = await createOwnContent(linkFail.client, 'c-1', 'products', {
      name: 'Nuevo',
      tags: ['Cacao'],
    });
    expect(linked.ok).toBe(false);
  });

  it('create: publish right check degrades on missing/erroneous company', async () => {
    h = makeSupabaseClient({ companies: { error: boom } });
    const err = await createOwnContent(h.client, 'c-1', 'products', { name: 'Nuevo' });
    expect(err.ok).toBe(false);
    if (!err.ok) expect(err.message).toContain('derecho');

    h = makeSupabaseClient({ companies: { row: { premium_until: null } } });
    const sparse = await createOwnContent(h.client, 'c-1', 'products', { name: 'Nuevo' });
    expect(sparse.ok).toBe(false);
  });

  it('update: reports update failures and tag link failures; no tags is a no-op', async () => {
    const updateFail = makeSupabaseClient({ products: { updateError: boom } });
    const updated = await updateOwnContent(updateFail.client, 'c-1', 'products', 'p-1', {
      name: 'Miel',
    });
    expect(updated.ok).toBe(false);
    if (!updated.ok) expect(updated.message).toContain('No se pudo guardar');

    const tagFail = makeSupabaseClient({
      products: { row: null },
      content_tags: { deleteError: boom },
    });
    const tagged = await updateOwnContent(tagFail.client, 'c-1', 'products', 'p-1', {
      name: 'Miel',
      tags: ['Cacao'],
    });
    expect(tagged.ok).toBe(false);
    if (!tagged.ok) expect(tagged.message).toContain('etiquetas');

    h = happyHarness();
    const noTags = await updateOwnContent(h.client, 'c-1', 'products', 'p-1', { name: 'Miel' });
    expect(noTags).toEqual({ ok: true });
    expect(h.calls.deletes['content_tags']).toContain('p-1');
  });

  it('delete: best-effort cleanup tolerates every failure', async () => {
    const imageFetchFail = makeSupabaseClient({ images: { error: boom } });
    expect(await deleteOwnContent(imageFetchFail.client, 'c-1', 'products', 'p-1')).toEqual({
      ok: true,
    });

    h = makeSupabaseClient(
      {
        images: {
          rows: [
            { id: 'i-1', storage_path: '' },
            { id: 'i-2', storage_path: 'c-1/product/p-1/b.jpg' },
          ],
          deleteError: boom,
        },
        content_tags: { deleteError: boom },
      },
      {},
      { removeError: boom },
    );
    expect(await deleteOwnContent(h.client, 'c-1', 'products', 'p-1')).toEqual({ ok: true });
    expect(h.calls.storageRemovals['media']).toContainEqual(['c-1/product/p-1/b.jpg']);

    const rowFail = makeSupabaseClient({ products: { deleteError: boom } });
    expect(await deleteOwnContent(rowFail.client, 'c-1', 'products', 'p-1')).toEqual({
      ok: false,
      message: 'No se pudo eliminar el contenido. Inténtalo de nuevo.',
    });
  });

  it('images: count and upload failures; insert rollback; null alt', async () => {
    const countFail = makeSupabaseClient({ images: { error: boom } });
    const counted = await addOwnContentImage(countFail.client, 'c-1', 'products', 'p-1', {
      name: 'f.jpg',
      bytes: jpeg,
    });
    expect(counted.ok).toBe(false);

    const uploadFail = makeSupabaseClient({}, {}, { uploadError: boom });
    const uploaded = await addOwnContentImage(uploadFail.client, 'c-1', 'products', 'p-1', {
      name: 'f.jpg',
      bytes: jpeg,
    });
    expect(uploaded.ok).toBe(false);
    if (!uploaded.ok) expect(uploaded.message).toContain('subir');

    const insertFail = makeSupabaseClient(
      { images: { insertError: boom } },
      {},
      { removeError: boom },
    );
    const inserted = await addOwnContentImage(insertFail.client, 'c-1', 'products', 'p-1', {
      name: 'f.jpg',
      bytes: jpeg,
    });
    expect(inserted.ok).toBe(false);
    expect(h.calls.storageRemovals['media']).toBeUndefined();
    expect(insertFail.calls.storageRemovals['media']).toHaveLength(1);

    h = makeSupabaseClient({
      products: {
        rows: [
          { id: 'p-1', name: 'Miel', description: '500 g', category_id: null, created_at: null },
        ],
      },
      images: { rows: [{ id: 'i-1', owner_id: 'p-1', storage_path: 'p/a.jpg', alt: null }] },
    });
    const rows = await listOwnContent(h.client, 'c-1', 'products');
    expect(rows[0]?.images).toEqual([
      { id: 'i-1', url: 'https://media.example/media/p/a.jpg', alt: null },
    ]);
  });

  it('removeOwnContentImage: fetch, storage and delete failures', async () => {
    h = makeSupabaseClient({ images: { error: boom } });
    expect(await removeOwnContentImage(h.client, 'i-1')).toEqual({
      ok: false,
      message: 'Imagen no encontrada.',
    });

    h = makeSupabaseClient(
      { images: { row: { id: 'i-1', storage_path: 'c-1/product/p-1/a.jpg' } } },
      {},
      { removeError: boom },
    );
    expect(await removeOwnContentImage(h.client, 'i-1')).toEqual({ ok: true });

    h = makeSupabaseClient({
      images: { row: { id: 'i-1', storage_path: 'c-1/product/p-1/a.jpg' }, deleteError: boom },
    });
    expect(await removeOwnContentImage(h.client, 'i-1')).toEqual({
      ok: false,
      message: 'No se pudo eliminar la imagen. Inténtalo de nuevo.',
    });
  });
});
