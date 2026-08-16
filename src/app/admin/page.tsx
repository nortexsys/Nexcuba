import Link from 'next/link';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

/** Backoffice dashboard (4.1): pending workload + section shortcuts. */
export default async function AdminHomePage() {
  const supabase = await getServerClient();
  const { count } = await supabase
    .from('registration_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const links = [
    { href: '/admin/solicitudes', label: es.auth.admin.nav.applications },
    { href: '/admin/empresas', label: es.auth.admin.nav.companies },
    { href: '/admin/taxonomias', label: es.auth.admin.nav.taxonomies },
    { href: '/admin/contenido', label: es.auth.admin.nav.content },
    { href: '/admin/networking', label: es.auth.admin.nav.networking },
    { href: '/admin/estadisticas', label: es.auth.admin.nav.stats },
    { href: '/admin/crm', label: es.auth.admin.nav.crm },
  ];

  return (
    <section className="grid gap-6">
      <div className="rounded-card bg-ink p-8 text-white">
        <h1 className="text-2xl font-bold">{es.auth.admin.title}</h1>
        <p className="mt-2 text-base text-white/80">
          {es.auth.admin.pendingApplications(count ?? 0)}
        </p>
        {count !== null && count > 0 && (
          <Link
            href="/admin/solicitudes?estado=pending"
            className="mt-4 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink hover:bg-cream-100"
          >
            {es.auth.admin.nav.applications}
          </Link>
        )}
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {es.auth.admin.quickLinks}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-ink hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
