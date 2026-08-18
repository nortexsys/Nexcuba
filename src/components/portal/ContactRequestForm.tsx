'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

const c = es.auth.portal.networking;

export type SendContactAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

const inputClass =
  'block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:border-ink';
const labelClass = 'grid gap-1 text-xs font-medium text-gray-600';

/**
 * Contact request form (H8 8.1): the target company is carried by a hidden
 * `targetSlug` field (from ?empresa=slug); the server re-validates everything.
 */
export function ContactRequestForm({
  action,
  targetSlug,
}: {
  action: SendContactAction;
  targetSlug: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);

  return (
    <form action={formAction} noValidate className="grid gap-4">
      <input type="hidden" name="targetSlug" value={targetSlug} />

      {state.status === 'error' && (
        <p
          role="alert"
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <p
          role="status"
          className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {state.message}
        </p>
      )}

      <label className={labelClass}>
        <span>{c.subject}</span>
        <input
          name="subject"
          type="text"
          maxLength={120}
          placeholder={c.subjectPlaceholder}
          className={inputClass}
          required
        />
      </label>

      <label className={labelClass}>
        <span>{c.message}</span>
        <textarea
          name="message"
          rows={5}
          maxLength={2000}
          placeholder={c.messagePlaceholder}
          className={inputClass}
          required
        />
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? c.sending : c.send}
      </Button>
    </form>
  );
}
