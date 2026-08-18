'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { initialAdminActionState, type AdminActionState } from '@/lib/admin/form';
import { es } from '@/locales/es';

const c = es.auth.portal.networking;

export type AcceptContactAction = (
  state: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

/** Accept button for a received pending contact request (H8 8.2). */
export function AcceptContactRequestButton({
  action,
  requestId,
}: {
  action: AcceptContactAction;
  requestId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialAdminActionState);

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      {state.status === 'error' && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {c.accept}
      </Button>
    </form>
  );
}
