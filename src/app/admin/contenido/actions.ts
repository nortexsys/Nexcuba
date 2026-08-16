'use server';

import { revalidatePath } from 'next/cache';
import type { AdminActionState } from '@/lib/admin/form';
import { deleteContent, setContentHidden } from '@/lib/server/backoffice/content';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export async function setVisibilityAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const type = String(formData.get('type') ?? '');
  const id = String(formData.get('id') ?? '');
  const hidden = formData.get('hidden') === 'on';

  const supabase = await getServerClient();
  const result = await setContentHidden(supabase, '', type, id, hidden);
  revalidatePath('/admin/contenido');
  return result.ok
    ? { status: 'success', message: es.auth.admin.content.saved }
    : { status: 'error', message: result.message };
}

export async function deleteContentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const type = String(formData.get('type') ?? '');
  const id = String(formData.get('id') ?? '');

  const supabase = await getServerClient();
  const result = await deleteContent(supabase, '', type, id);
  revalidatePath('/admin/contenido');
  return result.ok
    ? { status: 'success', message: es.auth.admin.content.saved }
    : { status: 'error', message: result.message };
}
