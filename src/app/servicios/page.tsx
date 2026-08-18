import type { Metadata } from 'next';
import { contentSection } from '@/app/_shared/content-section';
import { seoMetadata } from '@/lib/seo/meta';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const c = es.public.content.services;

export const metadata: Metadata = seoMetadata({
  title: c.title,
  description: c.subtitle,
  path: '/servicios',
});

export default contentSection('services');
