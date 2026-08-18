import type { SupabaseClient } from '@supabase/supabase-js';
import { computeNetworkingRight, mediaPublicUrl } from '@/lib/public/queries';
import { extensionForMime, IMAGE_LIMITS, validateImage } from '@/lib/uploads/validation';
import type { PortalActionResult } from '@/lib/server/portal/profile';

/**
 * Own-content CRUD (task 6.3, spec content-publishing): the four content
 * types, free-form tags (get-or-create — "libres, normalizadas al escribir")
 * and per-item images (≤8, `{companyId}/{type}/{contentId}/{uuid}.{ext}`).
 *
 * The publishing right is pre-checked for a friendly Premium CTA, but the
 * real wall is RLS (`own_can_publish()` on INSERT): a FREE foreign company
 * simply cannot insert. UPDATE/DELETE only require ownership (same as RLS).
 */

export type PortalContentType = 'products' | 'services' | 'projects' | 'opportunities';

export const PORTAL_CONTENT_TYPES: readonly PortalContentType[] = [
  'products',
  'services',
  'projects',
  'opportunities',
];

/** content_type stored in content_tags / images.owner_type is SINGULAR. */
const SINGULAR: Record<PortalContentType, string> = {
  products: 'product',
  services: 'service',
  projects: 'project',
  opportunities: 'opportunity',
};

export function toSingularType(type: PortalContentType): string {
  return SINGULAR[type];
}

export function isPortalContentType(value: string): value is PortalContentType {
  return (PORTAL_CONTENT_TYPES as readonly string[]).includes(value);
}

const COVERAGES = ['local', 'provincial', 'national', 'international'] as const;
const OPPORTUNITY_TYPES = [
  'proveedor',
  'cliente',
  'socio',
  'distribuidor',
  'tecnologia',
  'equipamiento',
  'materias_primas',
  'servicios',
  'financiacion',
  'inversion',
  'otro',
] as const;

const PREMIUM_MESSAGE =
  'Para publicar contenido, las empresas extranjeras necesitan el plan Premium.';

export interface OwnContentInput {
  name: string;
  description?: string;
  categoryId?: string | null; // products / services
  coverage?: string; // services
  statusLabel?: string; // projects
  needs?: string; // projects
  location?: string; // projects
  opportunityType?: string; // opportunities
  tags?: string[];
}

export type ContentMutationResult = { ok: true; id?: string } | { ok: false; message: string };

export interface ContentItemImage {
  id: string;
  url: string;
  alt: string | null;
}

export interface OwnContentItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  coverage: string | null;
  statusLabel: string | null;
  needs: string | null;
  location: string | null;
  opportunityType: string | null;
  createdAt: string;
  tagNames: string[];
  images: ContentItemImage[];
}

const LIST_COLUMNS: Record<PortalContentType, string> = {
  products: 'id, name, description, category_id, created_at',
  services: 'id, name, description, category_id, coverage, created_at',
  projects: 'id, name, description, status_label, needs, location, created_at',
  opportunities: 'id, name, description, opportunity_type, created_at',
};

function one(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  return (value as Record<string, unknown> | null) ?? null;
}

export async function listOwnContent(
  client: SupabaseClient,
  companyId: string,
  type: PortalContentType,
): Promise<OwnContentItem[]> {
  const { data, error } = await client
    .from(type)
    .select(LIST_COLUMNS[type])
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[listOwnContent]', type, error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id as string);
  const singular = SINGULAR[type];

  const [tagsResult, imagesResult] = await Promise.all([
    client
      .from('content_tags')
      .select('content_id, tags(name)')
      .eq('content_type', singular)
      .in('content_id', ids),
    client
      .from('images')
      .select('id, owner_id, storage_path, alt')
      .eq('owner_type', singular)
      .in('owner_id', ids),
  ]);

  const tagsByContent = new Map<string, string[]>();
  if (tagsResult.error) {
    console.error('[listOwnContent] tags', tagsResult.error.message);
  } else {
    for (const link of (tagsResult.data ?? []) as unknown as Record<string, unknown>[]) {
      const contentId = link.content_id as string;
      const name = (one(link.tags)?.name as string) ?? '';
      if (!name) continue;
      (tagsByContent.get(contentId) ?? tagsByContent.set(contentId, []).get(contentId)!).push(name);
    }
  }

  const imagesByOwner = new Map<string, ContentItemImage[]>();
  if (imagesResult.error) {
    console.error('[listOwnContent] images', imagesResult.error.message);
  } else {
    for (const image of (imagesResult.data ?? []) as unknown as Record<string, unknown>[]) {
      const ownerId = image.owner_id as string;
      const list = imagesByOwner.get(ownerId) ?? imagesByOwner.set(ownerId, []).get(ownerId)!;
      list.push({
        id: image.id as string,
        url: mediaPublicUrl(client, image.storage_path as string),
        alt: (image.alt as string | null) ?? null,
      });
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    coverage: (row.coverage as string | null) ?? null,
    statusLabel: (row.status_label as string | null) ?? null,
    needs: (row.needs as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    opportunityType: (row.opportunity_type as string | null) ?? null,
    createdAt: (row.created_at as string) ?? '',
    tagNames: tagsByContent.get(row.id as string) ?? [],
    images: imagesByOwner.get(row.id as string) ?? [],
  }));
}

// ── validation ────────────────────────────────────────────────────────────────

type Violation = string | null;

function validateInput(type: PortalContentType, input: OwnContentInput): Violation {
  if (!input.name || input.name.trim().length < 2) {
    return 'El nombre es obligatorio (mínimo 2 caracteres).';
  }
  if (input.description && input.description.length > 2000) {
    return 'La descripción no puede superar los 2000 caracteres.';
  }
  if (type === 'services' && input.coverage !== undefined) {
    if (!(COVERAGES as readonly string[]).includes(input.coverage)) {
      return 'La cobertura seleccionada no es válida.';
    }
  }
  if (type === 'opportunities') {
    if (!input.opportunityType) return 'El tipo de oportunidad es obligatorio.';
    if (!(OPPORTUNITY_TYPES as readonly string[]).includes(input.opportunityType)) {
      return 'El tipo de oportunidad no es válido.';
    }
  }
  return null;
}

function contentColumns(type: PortalContentType, input: OwnContentInput): Record<string, unknown> {
  const columns: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description?.trim() === '' ? null : (input.description?.trim() ?? null),
  };
  if (type === 'products' || type === 'services') {
    columns.category_id = input.categoryId?.trim() || null;
  }
  if (type === 'services' && input.coverage !== undefined) {
    columns.coverage = input.coverage;
  }
  if (type === 'projects') {
    columns.status_label = input.statusLabel?.trim() || null;
    columns.needs = input.needs?.trim() || null;
    columns.location = input.location?.trim() || null;
  }
  if (type === 'opportunities') {
    columns.opportunity_type = input.opportunityType;
  }
  return columns;
}

/** Trim + dedupe tag names ("normalizadas al escribir"). */
function normalizeTagNames(names: string[] | undefined): string[] {
  return [...new Set((names ?? []).map((name) => name.trim()).filter((name) => name.length > 0))];
}

/** Get-or-create tag ids by exact name (tags.name is unique; slug is generated). */
async function resolveTagIds(
  client: SupabaseClient,
  names: string[],
): Promise<{ ok: true; ids: string[] } | { ok: false; message: string }> {
  if (names.length === 0) return { ok: true, ids: [] };

  const { data, error } = await client.from('tags').select('id, name').in('name', names);
  if (error) {
    console.error('[resolveTagIds] lookup', error.message);
    return { ok: false, message: 'No se pudieron guardar las etiquetas. Inténtalo de nuevo.' };
  }

  const byName = new Map<string, string>();
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    byName.set(row.name as string, row.id as string);
  }

  const ids: string[] = [];
  for (const name of names) {
    const existing = byName.get(name);
    if (existing) {
      ids.push(existing);
      continue;
    }
    const { data: created, error: insertError } = await client
      .from('tags')
      .insert({ name })
      .select('id')
      .single();
    if (insertError || !created) {
      console.error('[resolveTagIds] create', insertError?.message);
      return { ok: false, message: 'No se pudieron guardar las etiquetas. Inténtalo de nuevo.' };
    }
    ids.push((created as Record<string, unknown>).id as string);
  }
  return { ok: true, ids };
}

/** Replace-all tag links for one content item (delete + insert). */
async function replaceTagLinks(
  client: SupabaseClient,
  type: PortalContentType,
  contentId: string,
  names: string[] | undefined,
): Promise<Violation> {
  const { error: deleteError } = await client
    .from('content_tags')
    .delete()
    .eq('content_id', contentId);
  if (deleteError) {
    console.error('[replaceTagLinks] delete', deleteError.message);
    return 'No se pudieron guardar las etiquetas. Inténtalo de nuevo.';
  }

  const normalized = normalizeTagNames(names);
  if (normalized.length === 0) return null;

  const resolved = await resolveTagIds(client, normalized);
  if (!resolved.ok) return resolved.message;

  const { error } = await client.from('content_tags').insert(
    resolved.ids.map((tagId) => ({
      content_type: SINGULAR[type],
      content_id: contentId,
      tag_id: tagId,
    })),
  );
  if (error) {
    console.error('[replaceTagLinks] insert', error.message);
    return 'No se pudieron guardar las etiquetas. Inténtalo de nuevo.';
  }
  return null;
}

// ── publishing right pre-check (friendly CTA; RLS remains the wall) ──────────

async function checkPublishingRight(client: SupabaseClient, companyId: string): Promise<Violation> {
  const { data, error } = await client
    .from('companies')
    .select('entity_type, status, premium_until')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !data) {
    console.error('[checkPublishingRight]', error?.message);
    return 'No se pudo verificar tu derecho de publicación. Inténtalo de nuevo.';
  }
  const company = data as Record<string, unknown>;
  const canPublish = computeNetworkingRight({
    role: 'company',
    status: (company.status as string) ?? '',
    entityType: (company.entity_type as string) ?? '',
    premiumUntil: (company.premium_until as string | null) ?? null,
  });
  return canPublish ? null : PREMIUM_MESSAGE;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createOwnContent(
  client: SupabaseClient,
  companyId: string,
  type: PortalContentType,
  input: OwnContentInput,
): Promise<ContentMutationResult> {
  const violation = validateInput(type, input);
  if (violation) return { ok: false, message: violation };

  const premiumBlock = await checkPublishingRight(client, companyId);
  if (premiumBlock) return { ok: false, message: premiumBlock };

  const { data, error } = await client
    .from(type)
    .insert({ company_id: companyId, ...contentColumns(type, input) })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[createOwnContent]', type, error?.message);
    return { ok: false, message: 'No se pudo guardar el contenido. Inténtalo de nuevo.' };
  }
  const contentId = (data as Record<string, unknown>).id as string;

  const tagFailure = await replaceTagLinks(client, type, contentId, input.tags);
  if (tagFailure) return { ok: false, message: tagFailure };

  return { ok: true, id: contentId };
}

export async function updateOwnContent(
  client: SupabaseClient,
  companyId: string,
  type: PortalContentType,
  id: string,
  input: OwnContentInput,
): Promise<ContentMutationResult> {
  void companyId; // RLS scopes the row to the owning company
  const violation = validateInput(type, input);
  if (violation) return { ok: false, message: violation };

  const { error } = await client.from(type).update(contentColumns(type, input)).eq('id', id);

  if (error) {
    console.error('[updateOwnContent]', type, error.message);
    return { ok: false, message: 'No se pudo guardar el contenido. Inténtalo de nuevo.' };
  }

  const tagFailure = await replaceTagLinks(client, type, id, input.tags);
  if (tagFailure) return { ok: false, message: tagFailure };

  return { ok: true };
}

export async function deleteOwnContent(
  client: SupabaseClient,
  companyId: string,
  type: PortalContentType,
  id: string,
): Promise<PortalActionResult> {
  void companyId;
  const singular = SINGULAR[type];

  // Images first (best-effort storage cleanup), then tag links, then the row.
  const { data: imageRows, error: imagesError } = await client
    .from('images')
    .select('id, storage_path')
    .eq('owner_type', singular)
    .eq('owner_id', id);

  if (imagesError) {
    console.error('[deleteOwnContent] images fetch', imagesError.message);
  } else {
    const rows = (imageRows ?? []) as unknown as Record<string, unknown>[];
    const paths = rows.map((row) => row.storage_path as string).filter(Boolean);
    if (paths.length > 0) {
      const { error: removeError } = await client.storage.from('media').remove(paths);
      if (removeError) console.error('[deleteOwnContent] storage', removeError.message);
    }
    for (const row of rows) {
      const { error } = await client
        .from('images')
        .delete()
        .eq('id', row.id as string);
      if (error) console.error('[deleteOwnContent] image row', error.message);
    }
  }

  const { error: tagsError } = await client.from('content_tags').delete().eq('content_id', id);
  if (tagsError) console.error('[deleteOwnContent] tag links', tagsError.message);

  const { error } = await client.from(type).delete().eq('id', id);
  if (error) {
    console.error('[deleteOwnContent]', type, error.message);
    return { ok: false, message: 'No se pudo eliminar el contenido. Inténtalo de nuevo.' };
  }
  return { ok: true };
}

// ── per-item images ───────────────────────────────────────────────────────────

export type ContentImageAddResult = { ok: true; id: string } | { ok: false; message: string };

export async function addOwnContentImage(
  client: SupabaseClient,
  companyId: string,
  type: PortalContentType,
  contentId: string,
  file: { name: string; bytes: Uint8Array },
  alt?: string,
): Promise<ContentImageAddResult> {
  const validation = validateImage(file.bytes);
  if (!validation.ok) return { ok: false, message: validation.error };

  const singular = SINGULAR[type];
  const { data: existing, error: countError } = await client
    .from('images')
    .select('id')
    .eq('owner_type', singular)
    .eq('owner_id', contentId)
    .limit(IMAGE_LIMITS.maxCount + 1);
  if (countError) {
    console.error('[addOwnContentImage] count', countError.message);
    return { ok: false, message: 'No se pudo subir la imagen. Inténtalo de nuevo.' };
  }
  if ((existing ?? []).length >= IMAGE_LIMITS.maxCount) {
    return { ok: false, message: 'Este elemento admite un máximo de 8 imágenes.' };
  }

  const ext = extensionForMime(validation.mime);
  const path = `${companyId}/${singular}/${contentId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await client.storage
    .from('media')
    .upload(path, file.bytes, { contentType: validation.mime, upsert: false });
  if (uploadError) {
    console.error('[addOwnContentImage] upload', uploadError.message);
    return { ok: false, message: 'No se pudo subir la imagen. Inténtalo de nuevo.' };
  }

  const { data, error } = await client
    .from('images')
    .insert({
      owner_type: singular,
      owner_id: contentId,
      storage_path: path,
      alt: alt?.trim() === '' || alt === undefined ? null : alt.trim(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[addOwnContentImage] insert', error?.message);
    const { error: removeError } = await client.storage.from('media').remove([path]);
    if (removeError) console.error('[addOwnContentImage] rollback', removeError.message);
    return { ok: false, message: 'No se pudo guardar la imagen. Inténtalo de nuevo.' };
  }
  return { ok: true, id: (data as Record<string, unknown>).id as string };
}

export async function removeOwnContentImage(
  client: SupabaseClient,
  imageId: string,
): Promise<PortalActionResult> {
  const { data, error } = await client
    .from('images')
    .select('id, storage_path')
    .eq('id', imageId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[removeOwnContentImage] fetch', error.message);
    return { ok: false, message: 'Imagen no encontrada.' };
  }

  const path = (data as Record<string, unknown>).storage_path as string;
  const { error: removeError } = await client.storage.from('media').remove([path]);
  if (removeError) console.error('[removeOwnContentImage] storage', removeError.message);

  const { error: deleteError } = await client.from('images').delete().eq('id', imageId);
  if (deleteError) {
    console.error('[removeOwnContentImage] delete', deleteError.message);
    return { ok: false, message: 'No se pudo eliminar la imagen. Inténtalo de nuevo.' };
  }
  return { ok: true };
}
