'use server';

import { zodFieldErrors, type AuthFormState } from '@/lib/auth/form-state';
import { cubanRegistrationSchema, foreignRegistrationSchema } from '@/lib/auth/schemas';
import { getServiceClient } from '@/lib/server/supabase-service';
import { submitCubanRegistration, submitForeignRegistration } from '@/lib/server/registration';
import { es } from '@/locales/es';

const REVIEW_FIELDS = 'Revisa los campos marcados.';

/** FormData → plain strings (the document File is handled separately). */
function formStrings(formData: FormData, exclude: string[] = []): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!exclude.includes(key) && typeof value === 'string') raw[key] = value;
  }
  return raw;
}

export async function registerCubanAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = cubanRegistrationSchema.safeParse(formStrings(formData, ['document']));
  if (!parsed.success) {
    return { status: 'error', fields: zodFieldErrors(parsed.error), message: REVIEW_FIELDS };
  }

  const file = formData.get('document');
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: 'error',
      fields: { document: 'El documento acreditativo es obligatorio.' },
      message: REVIEW_FIELDS,
    };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await submitCubanRegistration(getServiceClient(), parsed.data, {
      name: file.name,
      bytes,
    });
    if (!result.ok) {
      return result.field
        ? { status: 'error', fields: { [result.field]: result.message }, message: REVIEW_FIELDS }
        : { status: 'error', message: result.message };
    }
    return { status: 'success' };
  } catch (error) {
    console.error('[registerCubanAction]', error);
    return { status: 'error', message: es.common.error };
  }
}

export async function registerForeignAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = foreignRegistrationSchema.safeParse(formStrings(formData));
  if (!parsed.success) {
    return { status: 'error', fields: zodFieldErrors(parsed.error), message: REVIEW_FIELDS };
  }

  try {
    const result = await submitForeignRegistration(getServiceClient(), parsed.data);
    if (!result.ok) {
      return result.field
        ? { status: 'error', fields: { [result.field]: result.message }, message: REVIEW_FIELDS }
        : { status: 'error', message: result.message };
    }
    return { status: 'success' };
  } catch (error) {
    console.error('[registerForeignAction]', error);
    return { status: 'error', message: es.common.error };
  }
}
