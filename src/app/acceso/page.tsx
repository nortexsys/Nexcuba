import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { seoMetadata } from '@/lib/seo/meta';
import { es } from '@/locales/es';

import { loginAction } from './actions';

export const metadata: Metadata = seoMetadata({
  title: `${es.auth.login.title} · ${es.brand.name}`,
  description: es.seo.auth.login.description,
  path: '/acceso',
});

export default function AccesoPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{es.auth.login.title}</h1>

      <section className="mt-8 rounded-card border border-gray-200 bg-white p-6 sm:p-8">
        <LoginForm action={loginAction} />
        <p className="mt-6 text-sm text-gray-600">
          {es.auth.login.noAccount}{' '}
          <Link href="/registro" className="underline hover:text-ink">
            {es.auth.login.registerCta}
          </Link>
        </p>
      </section>
    </div>
  );
}
