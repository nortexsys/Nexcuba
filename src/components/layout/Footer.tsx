import Image from 'next/image';
import Link from 'next/link';
import { es } from '@/locales/es';

const platformLinks = [
  { href: '/empresas', label: es.header.nav.companies },
  { href: '/productos', label: es.header.nav.products },
  { href: '/servicios', label: es.header.nav.services },
  { href: '/proyectos', label: es.header.nav.projects },
  { href: '/oportunidades', label: es.header.nav.opportunities },
];

const companyLinks = [
  { href: '/sobre-nosotros', label: es.footer.company.about },
  { href: '/como-funciona', label: es.footer.company.howItWorks },
  { href: '/contacto', label: es.footer.company.contact },
];

const legalLinks = [
  { href: '/terminos', label: es.footer.legal.terms },
  { href: '/privacidad', label: es.footer.legal.privacy },
  { href: '/cookies', label: es.footer.legal.cookies },
];

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-gray-600 hover:text-ink">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Cream footer with 4 columns (design-spec §4). */
export function Footer() {
  return (
    <footer className="mt-16 bg-cream-200">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" />
              <span className="text-lg font-bold text-ink">{es.brand.name}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-gray-600">{es.footer.description}</p>
          </div>
          <FooterLinkColumn title={es.footer.platformTitle} links={platformLinks} />
          <FooterLinkColumn title={es.footer.companyTitle} links={companyLinks} />
          <FooterLinkColumn title={es.footer.legalTitle} links={legalLinks} />
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-600">
            {es.footer.copyright} ·{' '}
            {legalLinks.map((link, index) => (
              <span key={link.href}>
                {index > 0 && ' | '}
                <Link href={link.href} className="hover:text-ink">
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
