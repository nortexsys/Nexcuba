'use client';

import { useActionState } from 'react';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { cn } from '@/lib/utils/cn';

export type AdminAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export interface ActionButtonProps {
  action: AdminAction;
  /** Hidden inputs carried along (ids, kinds…). */
  fields?: Record<string, string>;
  label: string;
  /** Optional inline textarea (e.g. rejection reason). */
  textarea?: { name: string; placeholder?: string; minLength?: number; hint?: string };
  /** When set, the browser asks for confirmation before submitting. */
  confirmMessage?: string;
  danger?: boolean;
  compact?: boolean;
}

/**
 * Generic backoffice mutation form: hidden fields + optional textarea + one
 * pill button, with the action's message surfaced below (task 4.1 pattern for
 * every critical, audit-logged action).
 */
export function ActionButton({
  action,
  fields,
  label,
  textarea,
  confirmMessage,
  danger = false,
  compact = false,
}: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);

  return (
    <form
      action={formAction}
      noValidate
      className="grid gap-2"
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {textarea && (
        <textarea
          name={textarea.name}
          placeholder={textarea.placeholder}
          minLength={textarea.minLength}
          required={Boolean(textarea.minLength)}
          aria-label={textarea.placeholder ?? textarea.name}
          className="block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-ink placeholder:text-gray-400 focus:border-ink"
        />
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          compact ? 'px-4 py-1.5 text-xs font-medium' : 'px-6 py-3 text-sm font-medium',
          danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-ink text-white hover:bg-gray-800',
        )}
      >
        {label}
      </button>
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
      {state.status === 'success' && state.message && (
        <p role="status" className="text-xs text-gray-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
