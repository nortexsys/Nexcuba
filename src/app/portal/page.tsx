import Link from 'next/link';
import { getPortalDashboard } from '@/lib/server/portal/dashboard';
import { getOwnProfile } from '@/lib/server/portal/profile';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

const c = es.auth.portal.dashboard;
const nav = es.auth.portal.nav;

const CONTENT_LINKS = [
  { href: '/portal/productos', label: nav.products, key: 'products' },
  { href: '/portal/servicios', label: nav.services, key: 'services' },
  { href: '/portal/proyectos', label: nav.projects, key: 'projects' },
  { href: '/portal/oportunidades', label: nav.opportunities, key: 'opportunities' },
] as const;

/** Portal dashboard (task 6.1): completeness, content counts, networking. */
export default async function PortalHomePage() {
  const supabase = await getServerClient();
  const [dashboard, profile] = await Promise.all([
    getPortalDashboard(supabase),
    getOwnProfile(supabase),
  ]);

  if (!dashboard) {
    return (
      <section className="rounded-card border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-ink">{es.auth.portal.title}</h1>
        <p className="mt-2 text-base text-gray-600">{c.unavailable}</p>
      </section>
    );
  }

  const name = profile?.displayName?.trim() || profile?.legalName?.trim() || nav.company;

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{c.greeting(name)}</h1>
        <p className="mt-1 text-sm text-gray-500">{c.completenessHint}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-gray-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-600">{c.completeness}</h2>
          <p className="mt-2 text-4xl font-bold text-ink">{dashboard.completeness}%</p>
          <div
            role="progressbar"
            aria-valuenow={dashboard.completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={c.completeness}
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cream-100"
          >
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.min(100, Math.max(0, dashboard.completeness))}%` }}
            />
          </div>
          <Link
            href="/portal/empresa"
            className="mt-4 inline-block text-sm font-medium text-ink underline"
          >
            {nav.company} →
          </Link>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-600">{c.publishedTitle}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONTENT_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="grid gap-1 rounded-card border border-gray-100 bg-cream-50 p-4 transition-colors hover:border-ink"
                >
                  <span className="text-2xl font-bold text-ink">{dashboard.counts[link.key]}</span>
                  <span className="text-xs font-medium text-gray-600">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-600">{c.networkingTitle}</h2>
        <dl className="mt-3 flex flex-wrap gap-8">
          <div>
            <dt className="text-xs text-gray-500">{c.pendingRequests}</dt>
            <dd className="text-2xl font-bold text-ink">{dashboard.pendingRequests}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{c.establishedContacts}</dt>
            <dd className="text-2xl font-bold text-ink">{dashboard.establishedContacts}</dd>
          </div>
        </dl>
        <Link
          href="/portal/contactos"
          className="mt-4 inline-block text-sm font-medium text-ink underline"
        >
          {c.viewContacts} →
        </Link>
      </div>

      {dashboard.isForeignFree && (
        <div className="rounded-card border border-gold bg-cream-50 p-6">
          <h2 className="text-base font-bold text-ink">{c.premiumTitle}</h2>
          <p className="mt-2 text-sm text-gray-600">{c.premiumBody}</p>
          <p className="mt-1 text-xs text-gray-500">{c.premiumNote}</p>
        </div>
      )}
    </section>
  );
}
