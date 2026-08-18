import { absoluteUrl } from './site';
import { SITE_DESCRIPTION, SITE_NAME, DEFAULT_IMAGE } from './meta';

/**
 * JSON-LD builders (H9 §9.1, design §7). Plain serialisable objects so they
 * can be rendered anywhere with a `<script type="application/ld+json">` tag
 * (see `src/components/seo/JsonLd.tsx`) and unit-tested without React.
 */

const CONTEXT = 'https://schema.org' as const;

export interface OrganizationJsonLd {
  '@context': typeof CONTEXT;
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface BreadcrumbListJsonLd {
  '@context': typeof CONTEXT;
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }[];
}

export interface WebSiteJsonLd {
  '@context': typeof CONTEXT;
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: { '@type': 'EntryPoint'; urlTemplate: string };
    'query-input': 'required name=search_term_string';
  };
}

export interface CompanyProfileJsonLd extends OrganizationJsonLd {
  address?: {
    '@type': 'PostalAddress';
    addressCountry: 'CU';
    addressLocality?: string;
  };
}

/** NexCuba the platform, rendered on the home page. */
export function organizationJsonLd(): OrganizationJsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl(),
    logo: DEFAULT_IMAGE,
    description: SITE_DESCRIPTION,
  };
}

/** WebSite + SearchAction, rendered on the home page. */
export function websiteJsonLd(): WebSiteJsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/buscar')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Breadcrumb trail for deep routes (sector/province/company pages). */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): BreadcrumbListJsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** The company itself (Organization), rendered on its public ficha. */
export function companyProfileJsonLd(options: {
  name: string;
  slug: string;
  description: string | null;
  logo?: string | null;
  municipalityName?: string | null;
}): CompanyProfileJsonLd {
  const result: CompanyProfileJsonLd = {
    '@context': CONTEXT,
    '@type': 'Organization',
    name: options.name,
    url: absoluteUrl(`/empresas/${options.slug}`),
    logo: options.logo ?? DEFAULT_IMAGE,
    description: options.description ?? SITE_DESCRIPTION,
  };
  if (options.municipalityName) {
    result.address = {
      '@type': 'PostalAddress',
      addressCountry: 'CU',
      addressLocality: options.municipalityName,
    };
  }
  return result;
}
