import Link from 'next/link';
import { MarkNotificationsRead } from '@/components/portal/MarkNotificationsRead';
import { listNotifications } from '@/lib/server/portal/notifications';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { markNotificationsReadAction } from '../actions';

const c = es.auth.portal.notifications;

function payloadName(payload: Record<string, unknown>): string {
  const company = payload.company_name ?? payload.requester_name ?? payload.target_name;
  return typeof company === 'string' ? company : '';
}

/**
 * In-app notifications inbox (H8 8.3): rows are created by the DB trigger
 * 0012. Renders the message and a "mark all read" control.
 */
export default async function NotificationsPage() {
  const supabase = await getServerClient();
  const notifications = await listNotifications(supabase);

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{c.title}</h1>
        <MarkNotificationsRead action={markNotificationsReadAction} disabled={unreadCount === 0} />
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-card border border-gray-100 bg-white p-8 text-sm text-gray-500">
          {c.empty}
        </p>
      ) : (
        <ul className="grid gap-3">
          {notifications.map((notification) => {
            const body =
              notification.type === 'contact_request_received'
                ? c.contactRequestReceivedBody(payloadName(notification.payload))
                : c.contactRequestAcceptedBody(payloadName(notification.payload));
            return (
              <li
                key={notification.id}
                className={`rounded-card border p-5 ${
                  notification.readAt === null ? 'border-ink bg-white' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{body}</p>
                  {notification.readAt === null && (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-ink">
                      {c.unread}
                    </span>
                  )}
                </div>
                {notification.type === 'contact_request_received' && (
                  <Link
                    href="/portal/contactos"
                    className="mt-2 inline-block text-sm font-medium text-ink underline"
                  >
                    {es.auth.portal.networking.received} →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
