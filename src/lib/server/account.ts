import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { passwordSchema } from '@/lib/auth/schemas';

/**
 * Account self-service (design.md §3.4): staged email change and password
 * recovery. The staging of the email change is Supabase-native — `updateUser`
 * only applies the new address after the NEW mailbox confirms — while these
 * functions own the pre-flight validations and the Spanish user messaging.
 */

export type AccountActionResult =
  { ok: true; message: string } | { ok: false; field?: 'email' | 'password'; message: string };

const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio.')
  .email('El email no es válido.');

const RESET_MESSAGE =
  'Si el email está registrado, recibirás un enlace de recuperación de contraseña.';

function isDuplicateAuthError(error: { message?: string; status?: number }): boolean {
  return /already/i.test(error.message ?? '') || error.status === 422;
}

export async function requestEmailChange(
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
  newEmail: string,
): Promise<AccountActionResult> {
  const parsed = emailSchema.safeParse(newEmail);
  if (!parsed.success) {
    return {
      ok: false,
      field: 'email',
      message: parsed.error.issues[0]?.message ?? 'El email no es válido.',
    };
  }
  const target = parsed.data.toLowerCase();

  const { data: userData } = await userClient.auth.getUser();
  const currentEmail = userData.user?.email?.toLowerCase();
  if (!currentEmail) {
    return { ok: false, message: 'Debes iniciar sesión para cambiar tu email.' };
  }
  if (target === currentEmail) {
    return { ok: false, field: 'email', message: 'El nuevo email coincide con el actual.' };
  }

  // Duplicate check with service-role eyes: pending companies are invisible to RLS.
  const { data: taken } = await serviceClient
    .from('companies')
    .select('id')
    .ilike('email', target)
    .limit(1);
  if (taken && taken.length > 0) {
    return { ok: false, field: 'email', message: 'Ya existe una empresa con ese email.' };
  }

  const { error } = await userClient.auth.updateUser({ email: parsed.data });
  if (error) {
    if (isDuplicateAuthError(error)) {
      return { ok: false, field: 'email', message: 'Ya existe una empresa con ese email.' };
    }
    console.error('[account] email change failed', error.message);
    return { ok: false, message: 'No se pudo iniciar el cambio de email. Inténtalo de nuevo.' };
  }

  return {
    ok: true,
    message:
      'Hemos enviado un email de confirmación a la nueva dirección. El cambio se aplicará al confirmarlo.',
  };
}

export async function requestPasswordReset(
  client: SupabaseClient,
  email: string,
  origin: string,
): Promise<AccountActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return {
      ok: false,
      field: 'email',
      message: parsed.error.issues[0]?.message ?? 'El email no es válido.',
    };
  }

  const { error } = await client.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin.replace(/\/$/, '')}/acceso/reset`,
  });
  if (error) {
    // Anti-enumeration: always answer ok.
    console.error('[account] password reset request failed', error.message);
  }
  return { ok: true, message: RESET_MESSAGE };
}

export async function completePasswordReset(
  client: SupabaseClient,
  code: string,
  newPassword: string,
): Promise<AccountActionResult> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { ok: false, field: 'password', message: parsed.error.issues[0]?.message ?? '' };
  }

  const exchange = await client.auth.exchangeCodeForSession(code);
  if (exchange.error) {
    console.error('[account] recovery code exchange failed', exchange.error.message);
    return { ok: false, message: 'El enlace de recuperación no es válido o ha caducado.' };
  }

  const update = await client.auth.updateUser({ password: parsed.data });
  if (update.error) {
    console.error('[account] password update failed', update.error.message);
    return { ok: false, message: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' };
  }
  return { ok: true, message: 'Tu contraseña ha sido actualizada.' };
}
