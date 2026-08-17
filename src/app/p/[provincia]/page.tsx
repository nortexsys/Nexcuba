import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyCard } from '@/components/public/CompanyCard';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import { getProvinceBySlug, listPublicCompanies, safeQuery } from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const t = es.public.territory;
const d = es.public.directory;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provincia: string }>;
}): Promise<Metadata> {
  const { provincia } = await params;
  const province = await safeQuery(() => getProvinceBySlug(getPublicClient(), provincia), null);
  return { title: province ? `${province.name} · ${es.brand.name}` : t.notFound };
}

/**
 * Province page (task 5.5): approved Cuban companies located in the province
 * (foreign companies carry no province). Thin-page guard: 404 when unknown or
 * empty, per funcional §24.
 */
export default async function ProvincePage({ params }: { params: Promise<{ provincia: string }> }) {
  const { provincia } = await params;
  const client = getPublicClient();

  const province = await safeQuery(() => getProvinceBySlug(client, provincia), null);
  if (!province) notFound();

  const rows = await safeQuery(() => listPublicCompanies(client, { provinceId: province.id }), []);
  if (rows.length === 0) notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-sm">
        <Link href="/" className="text-gray-500 underline hover:text-ink">
          {es.brand.name}
        </Link>{' '}
        /{' '}
        <Link href="/empresas" className="text-gray-500 underline hover:text-ink">
          {d.title}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">{province.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.companiesIn(province.name, rows.length)}</p>

      <div className="mt-6">
        <DualListing
          sectionKey={`provincia-${provincia}`}
          cards={
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((company) => (
                <li key={company.id}>
                  <CompanyCard company={company} />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              ariaLabel={province.name}
              emptyLabel={t.empty}
              rows={rows}
              getRowKey={(row) => row.id}
              getRowHref={(row) => `/empresas/${row.slug}`}
              columns={[
                { key: 'name', header: d.title },
                {
                  key: 'entityType',
                  header: d.filterType,
                  render: (row) => d.entityType[row.entityType as 'mipyme'] ?? row.entityType,
                },
                {
                  key: 'location',
                  header: es.public.ficha.location,
                  render: (row) =>
                    [row.municipalityName, row.provinceName].filter(Boolean).join(', ') || '—',
                },
              ]}
            />
          }
        />
      </div>
    </main>
  );
}
