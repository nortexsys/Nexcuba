import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Content oversight (task 4.6, spec admin-backoffice): browse everything,
 * hide/unhide and delete — always audit-logged. Table names come from a
 * whitelist, never from user input (PostgREST cannot parameterize tables).
 */

export const CONTENT_TYPES = ['products', 'services', 'projects', 'opportunities'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export interface ContentRow {
  id: string;
  name: string;
  hidden: boolean;
  createdAt: string;
  companyName: string;
  detail: string;
}

const DETAIL_COLUMNS: Record<ContentType, string | null> = {
  products: null,
  services: 'coverage',
  projects: 'status_label',
  opportunities: 'opportunity_type',
};

export async function listContent(
  client: SupabaseClient,
  type: ContentType,
  filters: { hidden?: boolean; search?: string },
): Promise<ContentRow[]> {
  const detailColumn = DETAIL_COLUMNS[type];
  const columns = [
    'id, name, is_hidden, created_at',
    detailColumn ? detailColumn : null,
    'companies(legal_name)',
  ]
    .filter(Boolean)
    .join(', ');

  let query = client
    .from(type)
    .select(columns)
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.hidden !== undefined) query = query.eq('is_hidden', filters.hidden);
  const search = (filters.search ?? '').replace(/[,()%]/g, ' ').trim();
  if (search.length > 0) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error('[listContent]', error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  return rows.map((row) => {
    const company = Array.isArray(row.companies)
      ? (row.companies[0] as Record<string, unknown> | undefined)
      : (row.companies as Record<string, unknown> | undefined);
    return {
      id: row.id as string,
      name: row.name as string,
      hidden: row.is_hidden as boolean,
      createdAt: row.created_at as string,
      companyName: (company?.legal_name as string) ?? '',
      detail: detailColumn ? ((row[detailColumn] as string) ?? '') : '',
    };
  });
}

export type ContentActionResult = { ok: true } | { ok: false; message: string };

async function auditContent(
  client: SupabaseClient,
  action: string,
  type: ContentType,
  id: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.rpc('audit', {
    p_action: action,
    p_entity: type,
    p_entity_id: id,
    p_metadata: metadata,
  });
  if (error) console.error('[content] audit write failed', error.message);
}

async function contentName(client: SupabaseClient, type: ContentType, id: string): Promise<string> {
  const { data } = await client.from(type).select('name').eq('id', id).maybeSingle();
  return ((data as Record<string, unknown> | null)?.name as string) ?? '';
}

export async function setContentHidden(
  client: SupabaseClient,
  reviewerId: string,
  type: ContentType | string,
  id: string,
  hidden: boolean,
): Promise<ContentActionResult> {
  void reviewerId;
  if (!isContentType(type)) {
    return { ok: false, message: 'Tipo de contenido no válido.' };
  }

  const { error } = await client.from(type).update({ is_hidden: hidden }).eq('id', id);
  if (error) {
    console.error('[setContentHidden]', error.message);
    return { ok: false, message: 'No se pudo cambiar la visibilidad del contenido.' };
  }

  await auditContent(client, hidden ? 'content.hide' : 'content.unhide', type, id, {
    name: await contentName(client, type, id),
  });
  return { ok: true };
}

export async function deleteContent(
  client: SupabaseClient,
  reviewerId: string,
  type: ContentType | string,
  id: string,
): Promise<ContentActionResult> {
  void reviewerId;
  if (!isContentType(type)) {
    return { ok: false, message: 'Tipo de contenido no válido.' };
  }

  const name = await contentName(client, type, id);
  const { error } = await client.from(type).delete().eq('id', id);
  if (error) {
    console.error('[deleteContent]', error.message);
    return { ok: false, message: 'No se pudo eliminar el contenido.' };
  }

  await auditContent(client, 'content.delete', type, id, { name });
  return { ok: true };
}
