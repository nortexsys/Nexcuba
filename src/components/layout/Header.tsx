'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { es } from '@/locales/es';

const navLinks = [
  { href: '/empresas', label: es.header.nav.companies },
  { href: '/productos', label: es.header.nav.products },
  { href: '/servicios', label: es.header.nav.services },
  { href: '/proyectos', label: es.header.nav.projects },
  { href: '/oportunidades', label: es.header.nav.opportunities },
];

/**
 * Sticky white header (design-spec §4): logo left, nav center, ghost login +
 * dark register pill right. Below md the nav collapses into a menu button.
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2" aria-label={es.brand.name}>
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-md" priority />
          <span className="text-lg font-bold text-ink">{es.brand.name}</span>
        </Link>

        <nav aria-label={es.header.navLabel} className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-normal text-gray-700 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" href="/acceso">
            {es.header.login}
          </Button>
          <Button href="/registro">{es.header.register}</Button>
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? es.header.closeMenu : es.header.openMenu}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 stroke-current"
            fill="none"
            strokeWidth="2"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          aria-label={es.header.navLabelMobile}
          className="border-t border-gray-100 bg-white px-6 pb-4 pt-2 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-full px-4 py-2 text-base text-gray-700 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="ghost" href="/acceso" className="w-full">
              {es.header.login}
            </Button>
            <Button href="/registro" className="w-full">
              {es.header.register}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
