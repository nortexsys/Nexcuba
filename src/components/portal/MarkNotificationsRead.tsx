'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

const c = es.auth.portal.notifications;

export type MarkNotificationsAction = () => Promise<AdminActionState>;

/** "Mark all as read" (H8 8.3) — the action takes no form fields. */
export function MarkNotificationsRead({
  action,
  disabled,
}: {
  action: MarkNotificationsAction;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);

  return (
    <form action={formAction} noValidate>
      {state.status === 'error' && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="ghost" disabled={disabled || pending}>
        {c.markAllRead}
      </Button>
    </form>
  );
}
