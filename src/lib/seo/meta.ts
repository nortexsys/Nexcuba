import type { Metadata } from 'next';
import { es } from '@/locales/es';
import { absoluteUrl } from './site';

/**
 * Metadata helpers (H9 §9.1). Centralise how public routes produce their
 * title/description/canonical/Open Graph/Twitter so every page stays
 * consistent and covered by unit tests. Pages keep their own `title` strings
 * (templated with `%s · NexCuba` by the root layout).
 */

export const SITE_NAME = 'NexCuba';
export const SITE_DESCRIPTION = es.footer.description;
export const DEFAULT_IMAGE = absoluteUrl('/logo.png');

export interface SeoMetaInput {
  title: string;
  description: string;
  /** Route path starting with `/` — used to build the canonical URL. */
  path: string;
  /** Absolute or storage image URL for Open Graph. Falls back to the logo. */
  image?: string | null;
  type?: 'website' | 'profile' | 'article';
  /** Hide the page from index engines while keeping it reachable (thin pages). */
  noindex?: boolean;
}

export function seoMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
}: SeoMetaInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = image ?? DEFAULT_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
