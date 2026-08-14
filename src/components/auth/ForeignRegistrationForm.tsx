'use client';

import { useActionState } from 'react';
import { FormAlert, SuccessPanel, TextInput } from '@/components/auth/fields';
import { Button } from '@/components/ui/Button';
import { initialAuthFormState, type AuthFormState } from '@/lib/auth/form-state';
import { es } from '@/locales/es';

/** Foreign company application (spec: website required, no document). */
export function ForeignRegistrationForm({
  action,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialAuthFormState);
  const r = es.auth.register;
  const fieldError = (field: string) => state.fields?.[field];

  if (state.status === 'success') {
    return <SuccessPanel title={r.successTitle} body={r.successBody} />;
  }

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label={r.applicantFirstName}
          name="applicantFirstName"
          autoComplete="given-name"
          error={fieldError('applicantFirstName')}
          required
        />
        <TextInput
          label={r.applicantLastName}
          name="applicantLastName"
          autoComplete="family-name"
          error={fieldError('applicantLastName')}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label={r.email}
          name="email"
          type="email"
          autoComplete="email"
          error={fieldError('email')}
          required
        />
        <TextInput
          label={r.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          error={fieldError('phone')}
          required
        />
      </div>

      <TextInput
        label={r.companyName}
        name="companyName"
        autoComplete="organization"
        error={fieldError('companyName')}
        required
      />

      <TextInput
        label={r.country}
        name="country"
        autoComplete="country-name"
        error={fieldError('country')}
        required
      />

      <TextInput
        label={r.website}
        name="website"
        type="url"
        inputMode="url"
        placeholder="https://…"
        hint={r.websiteHint}
        autoComplete="url"
        error={fieldError('website')}
        required
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label={r.password}
          name="password"
          type="password"
          hint={r.passwordHint}
          autoComplete="new-password"
          error={fieldError('password')}
          required
        />
        <TextInput
          label={r.confirmPassword}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={fieldError('confirmPassword')}
          required
        />
      </div>

      {state.status === 'error' && state.message && <FormAlert message={state.message} />}

      <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
        {pending ? r.submitting : r.submit}
      </Button>
    </form>
  );
}
