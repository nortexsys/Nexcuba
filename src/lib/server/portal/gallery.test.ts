import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  addOwnGalleryImage,
  listOwnGalleryImages,
  removeOwnGalleryImage,
} from '@/lib/server/portal/gallery';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 'J'.charCodeAt(0)]);
const text = new TextEncoder().encode('no es una imagen');

let h: ReturnType<typeof makeSupabaseClient>;
beforeEach(() => {
  h = makeSupabaseClient({
    images: {
      rows: [{ id: 'i-1', storage_path: 'c-1/company/a.jpg', alt: 'Logo' }],
      row: { id: 'i-1', storage_path: 'c-1/company/a.jpg', alt: 'Logo' },
    },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listOwnGalleryImages (6.2)', () => {
  it('maps rows to public URLs', async () => {
    const rows = await listOwnGalleryImages(h.client, 'c-1');
    expect(rows).toEqual([
      { id: 'i-1', url: 'https://media.example/media/c-1/company/a.jpg', alt: 'Logo' },
    ]);
    expect(h.calls.eqFilters['images']).toContainEqual({ column: 'owner_type', value: 'company' });
  });
});

describe('addOwnGalleryImage (6.2: límites §content-publishing)', () => {
  it('uploads under company path and inserts the row', async () => {
    const result = await addOwnGalleryImage(
      h.client,
      'c-1',
      { name: 'foto.jpg', bytes: jpeg },
      'Local',
    );
    expect(result).toEqual({ ok: true, id: 'images-gen-1' });

    const upload = (h.client.storage.from as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [string];
    expect(upload[0]).toBe('media');
    expect(h.calls.inserts['images']?.[0]).toMatchObject({
      owner_type: 'company',
      owner_id: 'c-1',
      alt: 'Local',
    });
    const path = h.calls.inserts['images']?.[0]?.storage_path as string;
    expect(path).toMatch(/^c-1\/company\/[0-9a-f-]+\.jpe?g$/);
  });

  it('rejects non-image bytes regardless of the declared name', async () => {
    const result = await addOwnGalleryImage(h.client, 'c-1', { name: 'foto.jpg', bytes: text });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('no está admitido');
    expect(h.calls.inserts['images']).toBeUndefined();
  });

  it('enforces the 8-image gallery limit', async () => {
    h = makeSupabaseClient({
      images: { rows: Array.from({ length: 8 }, (_, i) => ({ id: `i-${i}` })), row: null },
    });
    const result = await addOwnGalleryImage(h.client, 'c-1', { name: 'foto.jpg', bytes: jpeg });
    expect(result).toEqual({
      ok: false,
      message: 'La galería admite un máximo de 8 imágenes.',
    });
  });
});

describe('removeOwnGalleryImage (6.2)', () => {
  it('deletes the row and the storage object', async () => {
    const result = await removeOwnGalleryImage(h.client, 'c-1', 'i-1');
    expect(result).toEqual({ ok: true });
    expect(h.calls.deletes['images']).toContain('i-1');
  });

  it('reports missing images (RLS hides other companies)', async () => {
    h = makeSupabaseClient({ images: { row: null } });
    const result = await removeOwnGalleryImage(h.client, 'c-1', 'ajena');
    expect(result).toEqual({ ok: false, message: 'Imagen no encontrada.' });
  });
});
