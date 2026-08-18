/**
 * Canonical site URL (H9, design §7). Single source of truth so canonical
 * links, Open Graph URLs, sitemap and JSON-LD all agree on the production
 * origin even when running locally or in CI.
 */

export const SITE_URL = 'https://nexcuba.org';

export function absoluteUrl(path = ''): string {
  if (!path || path === '/') return SITE_URL;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}
