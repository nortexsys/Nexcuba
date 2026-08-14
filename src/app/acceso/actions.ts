'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { zodFieldErrors, type AuthFormState } from '@/lib/auth/form-state';
import { decideLoginDestination, type SessionProfile } from '@/lib/auth/session';
import { completePasswordReset } from '@/lib/server/account';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio.').email('El email no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

const REVIEW_FIELDS = 'Revisa los campos marcados.';

type CompanyRelation = { status?: string } | { status?: string }[] | null | undefined;

function companyStatus(relation: CompanyRelation): SessionProfile['companyStatus'] {
  const status = Array.isArray(relation) ? relation[0]?.status : relation?.status;
  return status === 'approved' || status === 'rejected' || status === 'pending'
    ? status
    : undefined;
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', fields: zodFieldErrors(parsed.error), message: REVIEW_FIELDS };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      return {
        status: 'error',
        message: 'Confirma tu email antes de entrar. Revisa tu bandeja de entrada.',
      };
    }
    if (/invalid login credentials/i.test(error.message)) {
      return { status: 'error', message: 'Email o contraseña incorrectos.' };
    }
    console.error('[loginAction]', error.message);
    return { status: 'error', message: es.common.error };
  }

  // Session exists: decide by profile. Missing profile → treated as pending
  // by the portal gate (defensive; the signup saga always creates one).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, companies(status)')
    .maybeSingle();

  redirect(
    decideLoginDestination({
      role: profile?.role === 'admin' ? 'admin' : 'company',
      companyStatus: companyStatus(profile?.companies as CompanyRelation),
    }),
  );
}

const resetSchema = z.object({
  code: z.string().min(1),
  password: z.string(),
  confirmPassword: z.string(),
});

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'error', message: es.auth.reset.missingCode };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { status: 'error', fields: { confirmPassword: es.auth.reset.mismatch } };
  }

  const supabase = await getServerClient();
  const result = await completePasswordReset(supabase, parsed.data.code, parsed.data.password);
  if (!result.ok) {
    return result.field === 'password'
      ? { status: 'error', fields: { password: result.message } }
      : { status: 'error', message: result.message };
  }
  return { status: 'success', message: `${result.message} Ya puedes iniciar sesión.` };
}
