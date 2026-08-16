'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@/locales/es';

const sections = [
  {
    href: '/admin',
    label: es.auth.admin.nav.dashboard,
    match: (path: string) => path === '/admin',
  },
  {
    href: '/admin/solicitudes',
    label: es.auth.admin.nav.applications,
    match: (p: string) => p.startsWith('/admin/solicitudes'),
  },
  {
    href: '/admin/empresas',
    label: es.auth.admin.nav.companies,
    match: (p: string) => p.startsWith('/admin/empresas'),
  },
  {
    href: '/admin/taxonomias',
    label: es.auth.admin.nav.taxonomies,
    match: (p: string) => p.startsWith('/admin/taxonomias'),
  },
  {
    href: '/admin/contenido',
    label: es.auth.admin.nav.content,
    match: (p: string) => p.startsWith('/admin/contenido'),
  },
  {
    href: '/admin/networking',
    label: es.auth.admin.nav.networking,
    match: (p: string) => p.startsWith('/admin/networking'),
  },
  {
    href: '/admin/estadisticas',
    label: es.auth.admin.nav.stats,
    match: (p: string) => p.startsWith('/admin/estadisticas'),
  },
  {
    href: '/admin/crm',
    label: es.auth.admin.nav.crm,
    match: (p: string) => p.startsWith('/admin/crm'),
  },
];

/** Backoffice section navigation (dark header, task 4.1). */
export function AdminNav({ currentPath }: { currentPath?: string }) {
  const pathname = usePathname();
  const current = currentPath ?? pathname ?? '';

  return (
    <nav aria-label={es.auth.admin.title} className="border-t border-white/10">
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-6 py-2">
        {sections.map((section) => {
          const active = section.match(current);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink'
                    : 'rounded-full px-4 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white'
                }
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
