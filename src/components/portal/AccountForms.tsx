'use client';

import { useActionState } from 'react';
import { initialAdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';
import type { PortalAction } from '@/components/portal/ProfileForm';

const c = es.auth.portal.settings;

const inputClass =
  'block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:border-ink';
const labelClass = 'grid gap-1 text-xs font-medium text-gray-600';
const submitClass =
  'rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50';

/** Staged email change (task 6.4 → reuses the H3 account service). */
export function EmailChangeForm({ action }: { action: PortalAction }) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);
  return (
    <form action={formAction} noValidate className="grid gap-4">
      <label className={labelClass}>
        {c.newEmail}
        <input type="email" name="email" required autoComplete="email" className={inputClass} />
      </label>
      <p className="text-xs text-gray-400">{c.emailHint}</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={submitClass}>
          {pending ? c.saving : c.emailSubmit}
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

/** Password change (task 6.4 → Supabase updateUser({ password })). */
export function PasswordForm({ action }: { action: PortalAction }) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);
  return (
    <form action={formAction} noValidate className="grid gap-4">
      <label className={labelClass}>
        {c.newPassword}
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {c.confirmPassword}
        <input
          type="password"
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <p className="text-xs text-gray-400">{c.passwordHint}</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={submitClass}>
          {pending ? c.saving : c.passwordSubmit}
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
