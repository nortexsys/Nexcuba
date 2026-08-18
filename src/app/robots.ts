import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

/**
 * robots.txt (H9 §9.2). Public pages are crawlable; the authenticated portal,
 * backoffice and dynamic search results are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      {
        userAgent: '*',
        disallow: ['/portal', '/admin', '/buscar', '/acceso', '/registro', '/recuperar'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
