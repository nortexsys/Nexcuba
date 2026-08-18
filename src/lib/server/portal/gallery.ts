import type { SupabaseClient } from '@supabase/supabase-js';
import { extensionForMime, IMAGE_LIMITS, validateImage } from '@/lib/uploads/validation';
import { mediaPublicUrl } from '@/lib/public/queries';
import type { PortalActionResult } from '@/lib/server/portal/profile';

/**
 * Own-company gallery (task 6.2, spec content-publishing ≤8 images): list,
 * add (magic-bytes validation + `{companyId}/company/{uuid}.{ext}` path in the
 * public `media` bucket) and remove. RLS guarantees companies only touch
 * their own rows; the count pre-check gives the friendly limit message.
 */

export interface OwnGalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

export type GalleryAddResult = { ok: true; id: string } | { ok: false; message: string };

export async function listOwnGalleryImages(
  client: SupabaseClient,
  companyId: string,
): Promise<OwnGalleryImage[]> {
  const { data, error } = await client
    .from('images')
    .select('id, storage_path, alt')
    .eq('owner_type', 'company')
    .eq('owner_id', companyId)
    .order('position', { ascending: true })
    .limit(IMAGE_LIMITS.maxCount);

  if (error) {
    console.error('[listOwnGalleryImages]', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    url: mediaPublicUrl(client, row.storage_path as string),
    alt: (row.alt as string | null) ?? null,
  }));
}

async function countOwnGallery(client: SupabaseClient, companyId: string): Promise<number> {
  const { data, error } = await client
    .from('images')
    .select('id')
    .eq('owner_type', 'company')
    .eq('owner_id', companyId)
    .limit(IMAGE_LIMITS.maxCount + 1);
  if (error) {
    console.error('[countOwnGallery]', error.message);
    return 0;
  }
  return (data ?? []).length;
}

export async function addOwnGalleryImage(
  client: SupabaseClient,
  companyId: string,
  file: { name: string; bytes: Uint8Array },
  alt?: string,
): Promise<GalleryAddResult> {
  const validation = validateImage(file.bytes);
  if (!validation.ok) return { ok: false, message: validation.error };

  const existing = await countOwnGallery(client, companyId);
  if (existing >= IMAGE_LIMITS.maxCount) {
    return { ok: false, message: 'La galería admite un máximo de 8 imágenes.' };
  }

  const ext = extensionForMime(validation.mime);
  const path = `${companyId}/company/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await client.storage
    .from('media')
    .upload(path, file.bytes, { contentType: validation.mime, upsert: false });
  if (uploadError) {
    console.error('[addOwnGalleryImage] upload', uploadError.message);
    return { ok: false, message: 'No se pudo subir la imagen. Inténtalo de nuevo.' };
  }

  const { data, error } = await client
    .from('images')
    .insert({
      owner_type: 'company',
      owner_id: companyId,
      storage_path: path,
      alt: alt?.trim() === '' || alt === undefined ? null : alt.trim(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[addOwnGalleryImage] insert', error?.message);
    // Roll back the orphan storage object (best-effort).
    const { error: removeError } = await client.storage.from('media').remove([path]);
    if (removeError) console.error('[addOwnGalleryImage] rollback', removeError.message);
    return { ok: false, message: 'No se pudo guardar la imagen. Inténtalo de nuevo.' };
  }
  return { ok: true, id: (data as Record<string, unknown>).id as string };
}

export async function removeOwnGalleryImage(
  client: SupabaseClient,
  companyId: string,
  imageId: string,
): Promise<PortalActionResult> {
  void companyId; // RLS scopes the row; the eq filters are defence in depth
  const { data, error } = await client
    .from('images')
    .select('id, storage_path')
    .eq('id', imageId)
    .eq('owner_type', 'company')
    .eq('owner_id', companyId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[removeOwnGalleryImage] fetch', error.message);
    return { ok: false, message: 'Imagen no encontrada.' };
  }

  const path = (data as Record<string, unknown>).storage_path as string;
  const { error: removeError } = await client.storage.from('media').remove([path]);
  if (removeError) console.error('[removeOwnGalleryImage] storage', removeError.message);

  const { error: deleteError } = await client.from('images').delete().eq('id', imageId);
  if (deleteError) {
    console.error('[removeOwnGalleryImage] delete', deleteError.message);
    return { ok: false, message: 'No se pudo eliminar la imagen. Inténtalo de nuevo.' };
  }
  return { ok: true };
}
