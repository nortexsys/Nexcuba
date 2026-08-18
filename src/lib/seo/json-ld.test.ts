import { describe, expect, it } from 'vitest';
import {
  organizationJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  companyProfileJsonLd,
} from './json-ld';

describe('organizationJsonLd', () => {
  it('describes NexCuba as an Organization on the root URL', () => {
    const ld = organizationJsonLd();
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('Organization');
    expect(ld.name).toBe('NexCuba');
    expect(ld.url).toBe('https://nexcuba.org');
    expect(ld.logo).toBe('https://nexcuba.org/logo.png');
  });
});

describe('websiteJsonLd', () => {
  it('embeds the search action pointing at /buscar', () => {
    const ld = websiteJsonLd();
    expect(ld['@type']).toBe('WebSite');
    expect(ld.potentialAction.target.urlTemplate).toBe(
      'https://nexcuba.org/buscar?q={search_term_string}',
    );
    expect(ld.potentialAction['query-input']).toBe('required name=search_term_string');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers items from 1 and builds absolute URLs', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Empresas', path: '/empresas' },
      { name: 'Acme', path: '/empresas/acme' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Empresas', item: 'https://nexcuba.org/empresas' },
      { '@type': 'ListItem', position: 2, name: 'Acme', item: 'https://nexcuba.org/empresas/acme' },
    ]);
  });
});

describe('companyProfileJsonLd', () => {
  it('describes the company with its ficha URL and address', () => {
    const ld = companyProfileJsonLd({
      name: 'Acme',
      slug: 'acme',
      description: 'Una empresa.',
      logo: 'https://cdn.example/logo.png',
      municipalityName: 'La Habana',
    });
    expect(ld['@type']).toBe('Organization');
    expect(ld.url).toBe('https://nexcuba.org/empresas/acme');
    expect(ld.logo).toBe('https://cdn.example/logo.png');
    expect(ld.address).toEqual({
      '@type': 'PostalAddress',
      addressCountry: 'CU',
      addressLocality: 'La Habana',
    });
  });

  it('falls back to the platform logo and skips address without a municipality', () => {
    const ld = companyProfileJsonLd({
      name: 'Acme',
      slug: 'acme',
      description: null,
    });
    expect(ld.logo).toBe('https://nexcuba.org/logo.png');
    expect(ld.address).toBeUndefined();
  });
});
