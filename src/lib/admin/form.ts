/**
 * Shared state contract for backoffice mutations driven by `useActionState`.
 * Mirrors the auth form-state shape: one general Spanish message, no
 * field-level errors needed for admin actions.
 */
export type AdminActionStatus = 'idle' | 'error' | 'success';

export interface AdminActionState {
  status: AdminActionStatus;
  message?: string;
}

export const initialAdminActionState: AdminActionState = { status: 'idle' };
