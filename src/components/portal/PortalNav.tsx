'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@/locales/es';

const nav = es.auth.portal.nav;

type SectionMatch = (path: string) => boolean;

const sections: { href: string; label: string; match: SectionMatch }[] = [
  { href: '/portal', label: nav.dashboard, match: (p: string) => p === '/portal' },
  {
    href: '/portal/empresa',
    label: nav.company,
    match: (p: string) => p.startsWith('/portal/empresa'),
  },
  {
    href: '/portal/productos',
    label: nav.products,
    match: (p: string) => p.startsWith('/portal/productos'),
  },
  {
    href: '/portal/servicios',
    label: nav.services,
    match: (p: string) => p.startsWith('/portal/servicios'),
  },
  {
    href: '/portal/proyectos',
    label: nav.projects,
    match: (p: string) => p.startsWith('/portal/proyectos'),
  },
  {
    href: '/portal/oportunidades',
    label: nav.opportunities,
    match: (p: string) => p.startsWith('/portal/oportunidades'),
  },
  {
    href: '/portal/contactos',
    label: nav.contacts,
    match: (p: string) => p.startsWith('/portal/contactos'),
  },
  {
    href: '/portal/configuracion',
    label: nav.settings,
    match: (p: string) => p.startsWith('/portal/configuracion'),
  },
];

/** Portal section navigation — the eight areas of the company area (task 6.1). */
export function PortalNav({ currentPath }: { currentPath?: string }) {
  const pathname = usePathname();
  const current = currentPath ?? pathname ?? '';

  return (
    <nav aria-label={es.auth.portal.title} className="border-t border-gray-200">
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
                    ? 'rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white'
                    : 'rounded-full px-4 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink'
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
