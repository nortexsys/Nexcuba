'use client';

import { useActionState } from 'react';
import { FormAlert, TextInput } from '@/components/auth/fields';
import { Button } from '@/components/ui/Button';
import { initialAuthFormState, type AuthFormState } from '@/lib/auth/form-state';
import { es } from '@/locales/es';

/**
 * Second half of the Supabase recovery flow: the `code` from the email link
 * travels in a hidden field and is exchanged for a session inside the action.
 */
export function ResetPasswordForm({
  action,
  code,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  code: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialAuthFormState);
  const r = es.auth.reset;

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name="code" value={code} />
      <TextInput
        label={es.auth.login.password}
        name="password"
        type="password"
        autoComplete="new-password"
        hint={es.auth.register.passwordHint}
        error={state.fields?.password}
        required
      />
      <TextInput
        label={es.auth.register.confirmPassword}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={state.fields?.confirmPassword}
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
    </form>
  );
}
