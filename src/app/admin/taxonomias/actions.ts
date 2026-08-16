'use server';

import { revalidatePath } from 'next/cache';
import type { AdminActionState } from '@/lib/admin/form';
import {
  createCategory,
  createSector,
  createTag,
  renameTaxonomy,
  setTaxonomyActive,
  type TaxonomyKind,
} from '@/lib/server/backoffice/taxonomies';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

const t = es.auth.admin.taxonomies;

function done(result: { ok: boolean; message?: string }): AdminActionState {
  return result.ok
    ? { status: 'success', message: t.saved }
    : { status: 'error', message: result.message };
}

export async function createTaxonomyAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const kind = String(formData.get('kind') ?? '') as TaxonomyKind;
  const name = String(formData.get('name') ?? '');
  const scope = String(formData.get('scope') ?? 'product') as 'product' | 'service';

  const supabase = await getServerClient();
  const result =
    kind === 'sector'
      ? await createSector(supabase, { name })
      : kind === 'category'
        ? await createCategory(supabase, { name, scope })
        : await createTag(supabase, { name });

  revalidatePath('/admin/taxonomias');
  return done(result);
}

export async function renameTaxonomyAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '');

  const supabase = await getServerClient();
  const result = await renameTaxonomy(supabase, kind, id, name);
  revalidatePath('/admin/taxonomias');
  return done(result);
}

export async function toggleTaxonomyAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const next = formData.get('next') === 'on';

  const supabase = await getServerClient();
  const result = await setTaxonomyActive(supabase, kind, id, next);
  revalidatePath('/admin/taxonomias');
  return done(result);
}
