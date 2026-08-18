import type { Metadata } from 'next';
import Link from 'next/link';
import { ForeignRegistrationForm } from '@/components/auth/ForeignRegistrationForm';
import { seoMetadata } from '@/lib/seo/meta';
import { es } from '@/locales/es';

import { registerForeignAction } from '../actions';

export const metadata: Metadata = seoMetadata({
  title: `${es.auth.register.foreignTitle} · ${es.brand.name}`,
  description: es.seo.auth.registerForeign.description,
  path: '/registro/extranjera',
});

export default function RegistroExtranjeraPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{es.auth.register.foreignTitle}</h1>
      <p className="mt-2 text-base text-gray-600">{es.auth.register.foreignSubtitle}</p>

      <section className="mt-8 rounded-card border border-gray-200 bg-white p-6 sm:p-8">
        <ForeignRegistrationForm action={registerForeignAction} />
      </section>

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/registro" className="underline hover:text-ink">
          {es.auth.register.cubanLink}
        </Link>
      </p>
    </div>
  );
}
