'use client';

import { useActionState, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  FormAlert,
  SelectInput,
  SuccessPanel,
  TextInput,
  TextareaInput,
} from '@/components/auth/fields';
import { initialAuthFormState, type AuthFormState } from '@/lib/auth/form-state';
import { es } from '@/locales/es';

export interface TerritoryOption {
  id: number;
  name: string;
}
export interface MunicipalityOption {
  id: number;
  provinceId: number;
  name: string;
}

/**
 * MIPYME/cooperativa application form (spec company-registration). Field names
 * mirror the zod schema exactly; the server action is the only validator that
 * counts (client-side HTML validation stays off — noValidate).
 */
export function CubanRegistrationForm({
  action,
  provinces,
  municipalities,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  provinces: TerritoryOption[];
  municipalities: MunicipalityOption[];
}) {
  const [state, formAction, pending] = useActionState(action, initialAuthFormState);
  const [provinceId, setProvinceId] = useState('');
  const documentId = useId();

  const r = es.auth.register;
  const fieldError = (field: string) => state.fields?.[field];
  const visibleMunicipalities = provinceId
    ? municipalities.filter((m) => String(m.provinceId) === provinceId)
    : [];

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

      <SelectInput label={r.entityType} name="entityType" error={fieldError('entityType')} required>
        <option value="">—</option>
        <option value="mipyme">{r.entityTypeMipyme}</option>
        <option value="cooperative">{r.entityTypeCooperative}</option>
      </SelectInput>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectInput
          label={r.province}
          name="provinceId"
          error={fieldError('provinceId')}
          value={provinceId}
          onChange={(event) => setProvinceId(event.target.value)}
          required
        >
          <option value="">—</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          label={r.municipality}
          name="municipalityId"
          error={fieldError('municipalityId')}
          required
          disabled={visibleMunicipalities.length === 0}
        >
          <option value="">{visibleMunicipalities.length === 0 ? r.municipalityEmpty : '—'}</option>
          {visibleMunicipalities.map((municipality) => (
            <option key={municipality.id} value={municipality.id}>
              {municipality.name}
            </option>
          ))}
        </SelectInput>
      </div>

      <TextInput
        label={r.address}
        name="address"
        autoComplete="street-address"
        error={fieldError('address')}
        required
      />

      <TextareaInput
        label={r.extraIdData}
        name="extraIdData"
        hint={r.extraIdDataHint}
        error={fieldError('extraIdData')}
      />

      <div>
        <label htmlFor={documentId} className="block text-sm font-medium text-gray-700">
          {r.document}
        </label>
        <input
          id={documentId}
          name="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          aria-invalid={fieldError('document') ? true : undefined}
          aria-describedby={`${documentId}-hint`}
          className="mt-1 block w-full text-base text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <p id={`${documentId}-hint`} className="mt-1 text-xs text-gray-500">
          {r.documentHint}
        </p>
        {fieldError('document') && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {fieldError('document')}
          </p>
        )}
      </div>

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
