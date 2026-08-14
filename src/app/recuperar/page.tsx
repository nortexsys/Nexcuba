import type { Metadata } from 'next';
import { ResetRequestForm } from '@/components/auth/ResetRequestForm';
import { es } from '@/locales/es';

import { requestResetAction } from './actions';

export const metadata: Metadata = {
  title: `${es.auth.recover.title} · ${es.brand.name}`,
};

export default function RecuperarPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{es.auth.recover.title}</h1>
      <section className="mt-8 rounded-card border border-gray-200 bg-white p-6 sm:p-8">
        <ResetRequestForm action={requestResetAction} />
      </section>
    </main>
  );
}
