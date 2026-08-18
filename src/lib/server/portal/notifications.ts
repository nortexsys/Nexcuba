import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalActionResult } from '@/lib/server/portal/profile';

/**
 * In-app notifications (H8, spec networking §8.3): list own notifications,
 * count unread and mark all as read. Rows are created by the SYSTEM (trigger
 * 0012 / sweep 0008), never by the session client — the lib only reads and
 * marks-read, matching the notifications RLS (0006).
 */

export interface AppNotification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export async function listNotifications(client: SupabaseClient): Promise<AppNotification[]> {
  const { data, error } = await client
    .from('notifications')
    .select('id, type, payload, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[listNotifications]', error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    type: row.type as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    readAt: (row.read_at as string | null) ?? null,
  }));
}

export async function countUnreadNotifications(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .limit(1);
  if (error) {
    console.error('[countUnreadNotifications]', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationsRead(client: SupabaseClient): Promise<PortalActionResult> {
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) {
    console.error('[markNotificationsRead]', error.message);
    return { ok: false, message: 'No se pudieron marcar las notificaciones. Inténtalo de nuevo.' };
  }
  return { ok: true };
}
