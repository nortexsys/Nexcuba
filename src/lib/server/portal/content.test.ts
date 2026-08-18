import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  addOwnContentImage,
  createOwnContent,
  deleteOwnContent,
  listOwnContent,
  removeOwnContentImage,
  updateOwnContent,
} from '@/lib/server/portal/content';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 'J'.charCodeAt(0)]);
const text = new TextEncoder().encode('no es una imagen');

function companyRow(entityType: string, premium: string | null = null) {
  return { entity_type: entityType, status: 'approved', premium_until: premium };
}

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    profiles: { row: { role: 'company', company_id: 'c-1' } },
    companies: { row: companyRow('mipyme'), rows: [] },
    products: { rows: [], row: null },
    tags: { rows: [], row: null },
    content_tags: { rows: [], row: null },
    images: { rows: [], row: null },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listOwnContent (6.3)', () => {
  it('maps rows with tag names and image urls', async () => {
    h = makeSupabaseClient({
      products: {
        rows: [
          {
            id: 'p-1',
            name: 'Miel de abejas',
            description: '500 g',
            category_id: 'cat-1',
            created_at: '2026-01-01',
          },
        ],
      },
      content_tags: {
        rows: [
          { content_id: 'p-1', tags: { name: 'Cacao' } },
          { content_id: 'p-1', tags: { name: 'Orgánico' } },
        ],
      },
      images: {
        rows: [{ id: 'i-1', owner_id: 'p-1', storage_path: 'c-1/product/p-1/a.jpg', alt: null }],
      },
    });
    const items = await listOwnContent(h.client, 'c-1', 'products');
    expect(items).toEqual([
      {
        id: 'p-1',
        name: 'Miel de abejas',
        description: '500 g',
        categoryId: 'cat-1',
        coverage: null,
        statusLabel: null,
        needs: null,
        location: null,
        opportunityType: null,
        createdAt: '2026-01-01',
        tagNames: ['Cacao', 'Orgánico'],
        images: [
          { id: 'i-1', url: 'https://media.example/media/c-1/product/p-1/a.jpg', alt: null },
        ],
      },
    ]);
    expect(h.calls.eqFilters['content_tags']).toContainEqual({
      column: 'content_type',
      value: 'product',
    });
    expect(h.calls.eqFilters['images']).toContainEqual({ column: 'owner_type', value: 'product' });
  });

  it('returns empty without rows or on query failure', async () => {
    expect(await listOwnContent(h.client, 'c-1', 'products')).toEqual([]);
    h = makeSupabaseClient({ products: { error: { message: 'boom' } } });
    expect(await listOwnContent(h.client, 'c-1', 'products')).toEqual([]);
  });
});

describe('createOwnContent (6.3: pre-check de derecho a publicar)', () => {
  const baseInput = {
    name: 'Nuevo producto',
    description: 'Descripción',
    tags: ['Cacao', 'Orgánico'],
  };

  it('inserts the row, resolves tags get-or-create and links them', async () => {
    h = makeSupabaseClient({
      companies: { row: companyRow('mipyme') },
      tags: { rows: [{ id: 't-9', name: 'Cacao' }] },
    });
    const result = await createOwnContent(h.client, 'c-1', 'products', {
      ...baseInput,
      categoryId: 'cat-1',
    });
    expect(result).toEqual({ ok: true, id: 'products-gen-1' });

    expect(h.calls.inserts['products']?.[0]).toMatchObject({
      company_id: 'c-1',
      name: 'Nuevo producto',
      category_id: 'cat-1',
    });
    // Orgánico did not exist → created; Cacao reused.
    expect(h.calls.inserts['tags']?.[0]).toMatchObject({ name: 'Orgánico' });
    expect(h.calls.inserts['content_tags']?.[0]).toMatchObject([
      { content_type: 'product', content_id: 'products-gen-1', tag_id: 't-9' },
      { content_type: 'product', content_id: 'products-gen-1', tag_id: 'tags-gen-1' },
    ]);
  });

  it('rejects FREE foreign companies with the Premium CTA (RLS is the real wall)', async () => {
    h = makeSupabaseClient({ companies: { row: companyRow('foreign') } });
    const result = await createOwnContent(h.client, 'c-1', 'products', baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Premium');
    expect(h.calls.inserts['products']).toBeUndefined();
  });

  it('lets a foreign company with active premium publish', async () => {
    h = makeSupabaseClient({ companies: { row: companyRow('foreign', '2999-01-01T00:00:00Z') } });
    const result = await createOwnContent(h.client, 'c-1', 'products', baseInput);
    expect(result).toEqual({ ok: true, id: 'products-gen-1' });
  });

  it('validates name, coverage and opportunity type per content type', async () => {
    const noName = await createOwnContent(h.client, 'c-1', 'products', {
      ...baseInput,
      name: '  ',
    });
    expect(noName.ok).toBe(false);
    if (!noName.ok) expect(noName.message).toContain('obligatorio');

    const badCoverage = await createOwnContent(h.client, 'c-1', 'services', {
      name: 'Servicio',
      coverage: 'galáctico',
    });
    expect(badCoverage.ok).toBe(false);
    if (!badCoverage.ok) expect(badCoverage.message).toContain('cobertura');

    const missingType = await createOwnContent(h.client, 'c-1', 'opportunities', {
      name: 'Oportunidad',
    });
    expect(missingType.ok).toBe(false);
    if (!missingType.ok) expect(missingType.message).toContain('tipo de oportunidad');

    const badType = await createOwnContent(h.client, 'c-1', 'opportunities', {
      name: 'Oportunidad',
      opportunityType: 'no-existe',
    });
    expect(badType.ok).toBe(false);
  });

  it('reports the generic error when the insert fails', async () => {
    h = makeSupabaseClient({
      companies: { row: companyRow('mipyme') },
      products: { mutationError: { message: 'rls denied' } },
    });
    const result = await createOwnContent(h.client, 'c-1', 'products', baseInput);
    expect(result.ok).toBe(false);
  });
});

describe('updateOwnContent (6.3)', () => {
  it('updates allowed columns and replaces tag links', async () => {
    const result = await updateOwnContent(h.client, 'c-1', 'products', 'p-1', {
      name: 'Miel Premium',
      description: 'Edición 2026',
      tags: ['Exportación'],
    });
    expect(result).toEqual({ ok: true });
    expect(h.calls.updates['products']?.[0]).toMatchObject({
      name: 'Miel Premium',
      description: 'Edición 2026',
    });
    expect(h.calls.updates['products']?.[0]).not.toHaveProperty('company_id');
    expect(h.calls.deletes['content_tags']).toContain('p-1');
    expect(h.calls.inserts['content_tags']?.[0]).toMatchObject([
      { content_type: 'product', content_id: 'p-1', tag_id: 'tags-gen-1' },
    ]);
  });

  it('rejects an empty name', async () => {
    const result = await updateOwnContent(h.client, 'c-1', 'products', 'p-1', { name: '' });
    expect(result.ok).toBe(false);
  });
});

describe('deleteOwnContent (6.3: limpieza best-effort)', () => {
  it('removes storage objects, image rows, tag links and the content row', async () => {
    h = makeSupabaseClient({
      images: {
        rows: [
          { id: 'i-1', storage_path: 'c-1/product/p-1/a.jpg' },
          { id: 'i-2', storage_path: 'c-1/product/p-1/b.jpg' },
        ],
      },
    });
    const result = await deleteOwnContent(h.client, 'c-1', 'products', 'p-1');
    expect(result).toEqual({ ok: true });
    expect(h.calls.storageRemovals['media']).toContainEqual([
      'c-1/product/p-1/a.jpg',
      'c-1/product/p-1/b.jpg',
    ]);
    expect(h.calls.deletes['images']).toContain('i-1');
    expect(h.calls.deletes['images']).toContain('i-2');
    expect(h.calls.deletes['content_tags']).toContain('p-1');
    expect(h.calls.deletes['products']).toContain('p-1');
  });

  it('still deletes the content row when storage cleanup fails', async () => {
    const result = await deleteOwnContent(h.client, 'c-1', 'products', 'p-1');
    expect(result).toEqual({ ok: true });
    expect(h.calls.deletes['products']).toContain('p-1');
  });
});

describe('addOwnContentImage (6.3: ≤8 por elemento)', () => {
  it('uploads under the content path and inserts the row', async () => {
    const result = await addOwnContentImage(
      h.client,
      'c-1',
      'products',
      'p-1',
      {
        name: 'foto.jpg',
        bytes: jpeg,
      },
      'Vista frontal',
    );
    expect(result).toEqual({ ok: true, id: 'images-gen-1' });
    expect(h.calls.storageUploads['media']?.[0]?.path).toMatch(
      /^c-1\/product\/p-1\/[0-9a-f-]+\.jpe?g$/,
    );
    expect(h.calls.inserts['images']?.[0]).toMatchObject({
      owner_type: 'product',
      owner_id: 'p-1',
      alt: 'Vista frontal',
    });
  });

  it('rejects non-image bytes', async () => {
    const result = await addOwnContentImage(h.client, 'c-1', 'products', 'p-1', {
      name: 'foto.jpg',
      bytes: text,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('no está admitido');
  });

  it('enforces the 8-image per-item limit', async () => {
    h = makeSupabaseClient({
      images: { rows: Array.from({ length: 8 }, (_, i) => ({ id: `i-${i}` })) },
    });
    const result = await addOwnContentImage(h.client, 'c-1', 'products', 'p-1', {
      name: 'foto.jpg',
      bytes: jpeg,
    });
    expect(result).toEqual({ ok: false, message: 'Este elemento admite un máximo de 8 imágenes.' });
  });
});

describe('removeOwnContentImage (6.3)', () => {
  it('reports missing images', async () => {
    const result = await removeOwnContentImage(h.client, 'ajena');
    expect(result).toEqual({ ok: false, message: 'Imagen no encontrada.' });
  });

  it('deletes the storage object and the row', async () => {
    h = makeSupabaseClient({
      images: { row: { id: 'i-1', storage_path: 'c-1/product/p-1/a.jpg' } },
    });
    const result = await removeOwnContentImage(h.client, 'i-1');
    expect(result).toEqual({ ok: true });
    expect(h.calls.storageRemovals['media']).toContainEqual(['c-1/product/p-1/a.jpg']);
    expect(h.calls.deletes['images']).toContain('i-1');
  });
});
