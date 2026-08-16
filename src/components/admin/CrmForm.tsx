'use client';

import { useActionState } from 'react';
import type { AdminAction } from '@/components/admin/ActionButton';
import { initialAdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

export interface CrmFormInitial {
  hasWebsite: boolean;
  hasDomain: boolean;
  hasCorporateEmail: boolean;
  hasSocials: boolean;
  digitalNeeds: string | null;
  commercialPotential: 'low' | 'medium' | 'high';
  followupStatus: string | null;
  notes: string | null;
}

const inputClass =
  'mt-1 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm text-ink placeholder:text-gray-400 focus:border-ink';

/** Internal digitalization record editor (task 4.9) — admin-only by RLS. */
export function CrmForm({ action, initial }: { action: AdminAction; initial?: CrmFormInitial }) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);
  const f = es.auth.admin.crm.form;

  return (
    <form action={formAction} noValidate className="grid gap-4">
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">{f.hasWebsite}</legend>
        {(
          [
            ['hasWebsite', f.hasWebsite],
            ['hasDomain', f.hasDomain],
            ['hasCorporateEmail', f.hasCorporateEmail],
            ['hasSocials', f.hasSocials],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name={name}
              defaultChecked={initial ? initial[name] : false}
              className="h-4 w-4 rounded border-gray-300 accent-ink"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700">
          {f.digitalNeeds}
          <input
            name="digitalNeeds"
            defaultValue={initial?.digitalNeeds ?? ''}
            maxLength={2000}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          {f.potential}
          <select
            name="commercialPotential"
            defaultValue={initial?.commercialPotential ?? 'low'}
            className={inputClass}
          >
            <option value="low">{es.auth.admin.crm.potential.low}</option>
            <option value="medium">{es.auth.admin.crm.potential.medium}</option>
            <option value="high">{es.auth.admin.crm.potential.high}</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        {f.followupStatus}
        <input
          name="followupStatus"
          defaultValue={initial?.followupStatus ?? ''}
          maxLength={120}
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        {f.notes}
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ''}
          className={`${inputClass} min-h-20`}
        />
      </label>

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

      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {f.save}
      </button>
    </form>
  );
}
