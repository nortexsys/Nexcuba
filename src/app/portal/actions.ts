'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import type { AdminActionState } from '@/lib/admin/form';
import { passwordSchema } from '@/lib/auth/schemas';
import { requestEmailChange } from '@/lib/server/account';
import { clientIp, contactLimiter, RATE_LIMIT_MESSAGE } from '@/lib/server/rate-limit';
import {
  addOwnContentImage,
  createOwnContent,
  deleteOwnContent,
  isPortalContentType,
  removeOwnContentImage,
  updateOwnContent,
  type PortalContentType,
} from '@/lib/server/portal/content';
import { addOwnGalleryImage, removeOwnGalleryImage } from '@/lib/server/portal/gallery';
import { acceptContactRequest, sendContactRequest } from '@/lib/server/portal/networking';
import { markNotificationsRead } from '@/lib/server/portal/notifications';
import { setOwnSectors, updateOwnProfile } from '@/lib/server/portal/profile';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

/**
 * Portal server actions (tasks 6.2–6.4). Every action derives the company
 * from the SESSION profile (never from form input) and revalidates the
 * affected portal routes. Messages come from the lib modules or es.ts.
 */

/** Route fragment per content type (URLs are Spanish). */
const CONTENT_ROUTE: Record<PortalContentType, string> = {
  products: 'productos',
  services: 'servicios',
  projects: 'proyectos',
  opportunities: 'oportunidades',
};

function parseType(value: FormDataEntryValue | null): PortalContentType | null {
  const type = String(value ?? '');
  return isPortalContentType(type) ? type : null;
}

function parseId(value: FormDataEntryValue | null): string | null {
  const id = String(value ?? '').trim();
  return id.length > 0 ? id : null;
}

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? '').trim();
  if (raw === '') return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function requireCompanyId(): Promise<string | null> {
  const supabase = await getServerClient();
  const { data } = await supabase.from('profiles').select('company_id').maybeSingle();
  return ((data as Record<string, unknown> | null)?.company_id as string | null) ?? null;
}

const NO_SESSION: AdminActionState = { status: 'error', message: es.common.error };

export async function saveCompanyAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const supabase = await getServerClient();
  const platforms = formData.getAll('socialPlatform').map(String);
  const urls = formData.getAll('socialUrl').map(String);
  const socials = platforms
    .map((platform, index) => ({ platform, url: urls[index] ?? '' }))
    .filter((link) => link.platform.trim() !== '' || link.url.trim() !== '');

  const result = await updateOwnProfile(supabase, companyId, {
    displayName: String(formData.get('displayName') ?? ''),
    description: String(formData.get('description') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    website: String(formData.get('website') ?? ''),
    address: String(formData.get('address') ?? ''),
    provinceId: parseNumber(formData.get('provinceId')),
    municipalityId: parseNumber(formData.get('municipalityId')),
    socials,
  });
  if (!result.ok) return { status: 'error', message: result.message };

  const sectorsResult = await setOwnSectors(
    supabase,
    companyId,
    formData.getAll('sector').map(String),
  );
  if (!sectorsResult.ok) return { status: 'error', message: sectorsResult.message };

  revalidatePath('/portal/empresa');
  revalidatePath('/portal');
  return { status: 'success', message: es.auth.portal.company.saved };
}

export async function addGalleryImageAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: es.auth.portal.gallery.noFile };
  }

  const supabase = await getServerClient();
  const result = await addOwnGalleryImage(
    supabase,
    companyId,
    { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    String(formData.get('alt') ?? ''),
  );
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath('/portal/empresa');
  revalidatePath('/portal');
  return { status: 'success' };
}

export async function removeGalleryImageAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const imageId = parseId(formData.get('imageId'));
  if (!imageId) return NO_SESSION;

  const supabase = await getServerClient();
  const result = await removeOwnGalleryImage(supabase, companyId, imageId);
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath('/portal/empresa');
  revalidatePath('/portal');
  return { status: 'success' };
}

export async function saveContentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const type = parseType(formData.get('type'));
  if (!type) return NO_SESSION;
  const id = parseId(formData.get('id')); // absent → create

  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const input = {
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    categoryId: parseId(formData.get('categoryId')),
    coverage: type === 'services' ? String(formData.get('coverage') ?? '') : undefined,
    statusLabel: type === 'projects' ? String(formData.get('statusLabel') ?? '') : undefined,
    needs: type === 'projects' ? String(formData.get('needs') ?? '') : undefined,
    location: type === 'projects' ? String(formData.get('location') ?? '') : undefined,
    opportunityType:
      type === 'opportunities' ? String(formData.get('opportunityType') ?? '') : undefined,
    tags,
  };

  const supabase = await getServerClient();
  const result = id
    ? await updateOwnContent(supabase, companyId, type, id, input)
    : await createOwnContent(supabase, companyId, type, input);
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath(`/portal/${CONTENT_ROUTE[type]}`);
  revalidatePath('/portal');
  return { status: 'success', message: es.auth.portal.content.saved };
}

export async function deleteContentAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const type = parseType(formData.get('type'));
  const id = parseId(formData.get('id'));
  if (!type || !id) return NO_SESSION;

  const supabase = await getServerClient();
  const result = await deleteOwnContent(supabase, companyId, type, id);
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath(`/portal/${CONTENT_ROUTE[type]}`);
  revalidatePath('/portal');
  return { status: 'success', message: es.auth.portal.content.deleted };
}

export async function addContentImageAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const type = parseType(formData.get('type'));
  const id = parseId(formData.get('id'));
  if (!type || !id) return NO_SESSION;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: es.auth.portal.gallery.noFile };
  }

  const supabase = await getServerClient();
  const result = await addOwnContentImage(
    supabase,
    companyId,
    type,
    id,
    { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
    String(formData.get('alt') ?? ''),
  );
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath(`/portal/${CONTENT_ROUTE[type]}`);
  return { status: 'success' };
}

export async function removeContentImageAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const type = parseType(formData.get('type'));
  const imageId = parseId(formData.get('imageId'));
  if (!type || !imageId) return NO_SESSION;

  const supabase = await getServerClient();
  const result = await removeOwnContentImage(supabase, imageId);
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath(`/portal/${CONTENT_ROUTE[type]}`);
  return { status: 'success' };
}

export async function requestEmailChangeAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const supabase = await getServerClient();
  try {
    const { getServiceClient } = await import('@/lib/server/supabase-service');
    const result = await requestEmailChange(
      supabase,
      getServiceClient(),
      String(formData.get('email') ?? ''),
    );
    return result.ok
      ? { status: 'success', message: result.message }
      : { status: 'error', message: result.message };
  } catch (error) {
    console.error('[requestEmailChangeAction]', error);
    return { status: 'error', message: es.common.error };
  }
}

// ── Networking (H8, spec networking 8.1–8.2) ─────────────────────────────────

export async function sendContactRequestAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const ip = clientIp(await headers()) ?? 'unknown';
  if (!contactLimiter.check(ip).ok) {
    return { status: 'error', message: RATE_LIMIT_MESSAGE };
  }

  const supabase = await getServerClient();
  const result = await sendContactRequest(
    { client: supabase, companyId },
    {
      targetSlug: String(formData.get('targetSlug') ?? ''),
      subject: String(formData.get('subject') ?? ''),
      message: String(formData.get('message') ?? ''),
    },
  );
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath('/portal/contactos');
  revalidatePath('/portal');
  return { status: 'success', message: es.auth.portal.networking.requestSent };
}

export async function acceptContactRequestAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const requestId = String(formData.get('requestId') ?? '').trim();
  if (requestId === '') return NO_SESSION;

  const supabase = await getServerClient();
  const result = await acceptContactRequest({ client: supabase, companyId }, { requestId });
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath('/portal/contactos');
  revalidatePath('/portal');
  return { status: 'success', message: es.auth.portal.networking.requestAccepted };
}

export async function markNotificationsReadAction(): Promise<AdminActionState> {
  const companyId = await requireCompanyId();
  if (!companyId) return NO_SESSION;

  const supabase = await getServerClient();
  const result = await markNotificationsRead(supabase);
  if (!result.ok) return { status: 'error', message: result.message };

  revalidatePath('/portal/notificaciones');
  revalidatePath('/portal');
  return { status: 'success' };
}

export async function changePasswordAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password !== confirm) {
    return { status: 'error', message: es.auth.portal.settings.mismatch };
  }

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? es.common.error };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    console.error('[changePasswordAction]', error.message);
    return { status: 'error', message: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' };
  }
  return { status: 'success', message: 'Tu contraseña ha sido actualizada.' };
}
