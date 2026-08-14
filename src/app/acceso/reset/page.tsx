import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { es } from '@/locales/es';

import { resetPasswordAction } from '../actions';

export const metadata: Metadata = {
  title: `${es.auth.reset.title} · ${es.brand.name}`,
};

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <h1 className="text-3xl font-bold text-ink">{es.auth.reset.title}</h1>
        <p className="mt-4 text-base text-gray-600">{es.auth.reset.missingCode}</p>
        <p className="mt-6 text-sm">
          <Link href="/recuperar" className="underline hover:text-ink">
            {es.auth.recover.title}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{es.auth.reset.title}</h1>
      <section className="mt-8 rounded-card border border-gray-200 bg-white p-6 sm:p-8">
        <ResetPasswordForm action={resetPasswordAction} code={code} />
      </section>
    </main>
  );
}
