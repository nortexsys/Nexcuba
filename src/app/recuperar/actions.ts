'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { zodFieldErrors, type AuthFormState } from '@/lib/auth/form-state';
import { requestPasswordReset } from '@/lib/server/account';
import { clientIp, RATE_LIMIT_MESSAGE, resetLimiter } from '@/lib/server/rate-limit';
import { getServerClient } from '@/lib/supabase/server';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio.')
  .email('El email no es válido.');

async function currentOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('host') ?? 'nexcuba.org';
  const proto =
    headerList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function requestResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData).email);
  if (!parsed.success) {
    return { status: 'error', fields: zodFieldErrors(parsed.error) };
  }

  const ip = clientIp(await headers()) ?? 'unknown';
  if (!resetLimiter.check(ip).ok) {
    return { status: 'error', message: RATE_LIMIT_MESSAGE };
  }

  const supabase = await getServerClient();
  const result = await requestPasswordReset(supabase, parsed.data, await currentOrigin());
  if (!result.ok) {
    return result.field
      ? { status: 'error', fields: { [String(result.field)]: result.message } }
      : { status: 'error', message: result.message };
  }
  return { status: 'success', message: result.message };
}
