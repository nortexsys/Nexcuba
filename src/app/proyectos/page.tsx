import type { Metadata } from 'next';
import { contentSection } from '@/app/_shared/content-section';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: `${es.public.content.projects.title} · ${es.brand.name}`,
};

export default contentSection('projects');
