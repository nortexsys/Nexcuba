'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormAlert, TextInput } from '@/components/auth/fields';
import { Button } from '@/components/ui/Button';
import { initialAuthFormState, type AuthFormState } from '@/lib/auth/form-state';
import { es } from '@/locales/es';

export function LoginForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialAuthFormState);
  const l = es.auth.login;

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <TextInput
        label={l.email}
        name="email"
        type="email"
        autoComplete="email"
        error={state.fields?.email}
        required
      />
      <TextInput
        label={l.password}
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fields?.password}
        required
      />

      {state.status === 'error' && state.message && <FormAlert message={state.message} />}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? l.submitting : l.submit}
      </Button>

      <p className="text-sm text-gray-600">
        <Link href="/recuperar" className="underline hover:text-ink">
          {l.forgot}
        </Link>
      </p>
    </form>
  );
}
