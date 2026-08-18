import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyCard } from '@/components/public/CompanyCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import {
  getProvinceBySlug,
  listProvinces,
  listPublicCompanies,
  safeQuery,
} from '@/lib/public/queries';
import { seoMetadata } from '@/lib/seo/meta';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

export const revalidate = 300;

const t = es.public.territory;
const d = es.public.directory;

/** ISR (H9 §9.4): pre-render known provinces; with no DB reachable at build
    time this returns [], leaving the route on-demand. */
export async function generateStaticParams() {
  const provinces = await safeQuery(() => listProvinces(getPublicClient()), []);
  return provinces.map((province) => ({ provincia: province.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provincia: string }>;
}): Promise<Metadata> {
  const { provincia } = await params;
  const province = await safeQuery(() => getProvinceBySlug(getPublicClient(), provincia), null);
  if (!province) return { title: t.notFound };
  return seoMetadata({
    title: province.name,
    description: t.companiesIn(province.name, 1),
    path: `/p/${province.slug}`,
  });
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
    <div className="mx-auto max-w-7xl px-6 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: d.title, path: '/empresas' },
          { name: province.name, path: `/p/${province.slug}` },
        ])}
      />
      <p className="text-sm">
        <Link href="/" className="text-gray-600 underline hover:text-ink">
          {es.brand.name}
        </Link>{' '}
        /{' '}
        <Link href="/empresas" className="text-gray-600 underline hover:text-ink">
          {d.title}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">{province.name}</h1>
      <p className="mt-1 text-sm text-gray-600">{t.companiesIn(province.name, rows.length)}</p>

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
    </div>
  );
}
