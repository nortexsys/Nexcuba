'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormAlert, TextInput } from '@/components/auth/fields';
import { Button } from '@/components/ui/Button';
import { initialAuthFormState, type AuthFormState } from '@/lib/auth/form-state';
import { es } from '@/locales/es';

/** Requests a Supabase recovery email (spec: password reset via recovery). */
export function ResetRequestForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialAuthFormState);
  const r = es.auth.recover;

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <TextInput
        label={es.auth.login.email}
        name="email"
        type="email"
        autoComplete="email"
        error={state.fields?.email}
        required
      />

      {state.status === 'error' && state.message && <FormAlert message={state.message} />}
      {state.status === 'success' && state.message && (
        <p className="rounded-2xl border border-gold bg-cream-50 px-4 py-3 text-sm text-gray-700">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? r.submitting : r.submit}
      </Button>

      <p className="text-sm text-gray-600">
        <Link href="/acceso" className="underline hover:text-ink">
          {r.back}
        </Link>
      </p>
    </form>
  );
}
