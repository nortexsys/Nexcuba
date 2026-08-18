import Link from 'next/link';
import { AcceptContactRequestButton } from '@/components/portal/AcceptContactRequestButton';
import { ContactRequestForm } from '@/components/portal/ContactRequestForm';
import { listContactInbox } from '@/lib/server/portal/networking';
import { getOwnProfile } from '@/lib/server/portal/profile';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { acceptContactRequestAction, sendContactRequestAction } from '../actions';

const c = es.auth.portal.networking;

function companyLabel(name: string, slug: string) {
  return name || slug;
}

/**
 * Networking hub (H8 8.1/8.2): with `?empresa=slug` it shows the contact
 * request form; otherwise the inbox (received/sent/established).
 */
export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;
  const supabase = await getServerClient();
  const profile = await getOwnProfile(supabase);

  if (!profile) {
    return (
      <section className="rounded-card border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-ink">{c.title}</h1>
        <p className="mt-2 text-base text-gray-600">{es.auth.portal.dashboard.unavailable}</p>
      </section>
    );
  }

  const inbox = await listContactInbox(supabase, profile.companyId);
  const targetSlug = empresa?.trim() ?? '';

  if (targetSlug !== '') {
    const targetName = inbox.established
      .concat(inbox.sent)
      .find((item) => item.counterpart?.slug === targetSlug)?.counterpart?.name;
    return (
      <section className="grid gap-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {targetName ? c.toCompany(targetName) : c.newRequest}
          </h1>
          <Link
            href="/portal/contactos"
            className="mt-2 inline-block text-sm font-medium text-ink underline"
          >
            {c.backToInbox} →
          </Link>
        </div>
        <div className="rounded-card border border-gray-100 bg-white p-6">
          <ContactRequestForm action={sendContactRequestAction} targetSlug={targetSlug} />
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{c.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{c.intro}</p>
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-600">{c.received}</h2>
        {inbox.received.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{c.receivedEmpty}</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {inbox.received.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-100 bg-cream-50 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {companyLabel(item.counterpart?.name ?? '', item.counterpart?.slug ?? '')}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.subject}</p>
                </div>
                <AcceptContactRequestButton
                  action={acceptContactRequestAction}
                  requestId={item.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-600">{c.sent}</h2>
        {inbox.sent.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{c.sentEmpty}</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {inbox.sent.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-100 bg-cream-50 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {companyLabel(item.counterpart?.name ?? '', item.counterpart?.slug ?? '')}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{item.subject}</p>
                </div>
                <span className="text-xs font-medium text-gray-500">{item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-600">{c.established}</h2>
        {inbox.established.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{c.establishedEmpty}</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {inbox.established.map((item) => (
              <li key={item.id}>
                {item.counterpart ? (
                  <Link
                    href={`/empresas/${item.counterpart.slug}`}
                    className="block rounded-card border border-gray-100 bg-cream-50 p-4 transition-colors hover:border-ink"
                  >
                    <p className="text-sm font-semibold text-ink">
                      {companyLabel(item.counterpart.name, item.counterpart.slug)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{item.subject}</p>
                  </Link>
                ) : (
                  <p className="rounded-card border border-gray-100 bg-cream-50 p-4 text-sm text-gray-500">
                    {item.subject}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
