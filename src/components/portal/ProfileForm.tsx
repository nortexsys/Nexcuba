'use client';

import { useActionState, useState } from 'react';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

export type PortalAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

const c = es.auth.portal.company;

export interface ProfileFormProps {
  action: PortalAction;
  profile: {
    displayName: string | null;
    description: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    provinceId: number | null;
    municipalityId: number | null;
    socials: { platform: string; url: string }[];
    sectorIds: string[];
  };
  provinces: { id: number; name: string }[];
  municipalities: { id: number; name: string; provinceId: number }[];
  sectors: { id: string; name: string }[];
}

const inputClass =
  'block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:border-ink';
const labelClass = 'grid gap-1 text-xs font-medium text-gray-600';
const MAX_SOCIALS = 4;

/**
 * Mi empresa editor (task 6.2): non-privileged ficha fields, sector
 * checkboxes (≤5 enforced server-side) and up to four social rows. The
 * municipality list is filtered client-side by the chosen province.
 */
export function ProfileForm({
  action,
  profile,
  provinces,
  municipalities,
  sectors,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);
  const [provinceId, setProvinceId] = useState<number | null>(profile.provinceId);
  const [socials, setSocials] = useState(profile.socials.length > 0 ? profile.socials : []);

  const visibleMunicipalities = provinceId
    ? municipalities.filter((municipality) => municipality.provinceId === provinceId)
    : [];

  const inputId = (name: string) => `profile-${name}`;

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass} htmlFor={inputId('displayName')}>
          {c.displayName}
          <input
            id={inputId('displayName')}
            name="displayName"
            defaultValue={profile.displayName ?? ''}
            className={inputClass}
            maxLength={80}
          />
        </label>
        <label className={labelClass} htmlFor={inputId('phone')}>
          {c.phone}
          <input
            id={inputId('phone')}
            name="phone"
            defaultValue={profile.phone ?? ''}
            className={inputClass}
            maxLength={30}
          />
        </label>
        <label className={labelClass} htmlFor={inputId('website')}>
          {c.website}
          <input
            id={inputId('website')}
            name="website"
            type="url"
            placeholder="https://…"
            defaultValue={profile.website ?? ''}
            className={inputClass}
          />
        </label>
        <label className={labelClass} htmlFor={inputId('address')}>
          {c.address}
          <input
            id={inputId('address')}
            name="address"
            defaultValue={profile.address ?? ''}
            className={inputClass}
            maxLength={200}
          />
        </label>
        <label className={labelClass} htmlFor={inputId('provinceId')}>
          {c.province}
          <select
            id={inputId('provinceId')}
            name="provinceId"
            value={provinceId ?? ''}
            onChange={(event) => {
              const next = event.target.value === '' ? null : Number(event.target.value);
              setProvinceId(next);
            }}
            className={inputClass}
          >
            <option value="">{es.public.directory.allProvinces}</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass} htmlFor={inputId('municipalityId')}>
          {c.municipality}
          <select
            id={inputId('municipalityId')}
            name="municipalityId"
            defaultValue={profile.municipalityId ?? ''}
            className={inputClass}
            disabled={visibleMunicipalities.length === 0}
          >
            <option value="">{c.municipalityEmpty}</option>
            {visibleMunicipalities.map((municipality) => (
              <option key={municipality.id} value={municipality.id}>
                {municipality.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass} htmlFor={inputId('description')}>
        {c.description}
        <textarea
          id={inputId('description')}
          name="description"
          defaultValue={profile.description ?? ''}
          rows={4}
          className={inputClass}
          maxLength={2000}
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-xs font-medium text-gray-600">{c.sectors}</legend>
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <label
              key={sector.id}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm text-ink"
            >
              <input
                type="checkbox"
                name="sector"
                value={sector.id}
                defaultChecked={profile.sectorIds.includes(sector.id)}
                className="h-4 w-4 accent-ink"
              />
              {sector.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-xs font-medium text-gray-600">{c.socials}</legend>
        {socials.map((social, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <label className={`${labelClass} flex-1`}>
              {c.socialPlatform}
              <input
                name="socialPlatform"
                defaultValue={social.platform}
                className={inputClass}
                maxLength={40}
              />
            </label>
            <label className={`${labelClass} flex-[2]`}>
              {c.socialUrl}
              <input
                name="socialUrl"
                defaultValue={social.url}
                placeholder="https://…"
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() => setSocials(socials.filter((_, i) => i !== index))}
              className="rounded-full px-4 py-2 text-xs text-gray-500 underline hover:text-ink"
            >
              {c.removeSocial}
            </button>
          </div>
        ))}
        {socials.length < MAX_SOCIALS && (
          <button
            type="button"
            onClick={() => setSocials([...socials, { platform: '', url: '' }])}
            className="justify-self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100"
          >
            + {c.addSocial}
          </button>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? c.saving : c.save}
        </button>
        {state.status === 'error' && state.message && (
          <p role="alert" className="text-sm text-red-600">
            {state.message}
          </p>
        )}
        {state.status === 'success' && state.message && (
          <p role="status" className="text-sm text-gray-700">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
