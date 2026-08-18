import type { Metadata } from 'next';
import Link from 'next/link';
import { CubanRegistrationForm } from '@/components/auth/CubanRegistrationForm';
import { seoMetadata } from '@/lib/seo/meta';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { registerCubanAction } from './actions';

export const metadata: Metadata = seoMetadata({
  title: `${es.auth.register.title} · ${es.brand.name}`,
  description: es.seo.auth.register.description,
  path: '/registro',
});

export default async function RegistroPage() {
  const supabase = await getServerClient();
  const [{ data: provinces }, { data: municipalities }] = await Promise.all([
    supabase.from('provinces').select('id, name').order('id'),
    supabase.from('municipalities').select('id, province_id, name').order('name'),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{es.auth.register.title}</h1>
      <p className="mt-2 text-base text-gray-600">{es.auth.register.subtitle}</p>

      <section className="mt-8 rounded-card border border-gray-200 bg-white p-6 sm:p-8">
        <CubanRegistrationForm
          action={registerCubanAction}
          provinces={provinces ?? []}
          municipalities={(municipalities ?? []).map((m) => ({
            id: m.id,
            provinceId: m.province_id,
            name: m.name,
          }))}
        />
      </section>

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/registro/extranjera" className="underline hover:text-ink">
          {es.auth.register.foreignLink}
        </Link>
      </p>
    </div>
  );
}
