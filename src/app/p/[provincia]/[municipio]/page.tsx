import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyCard } from '@/components/public/CompanyCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import {
  getMunicipalityBySlug,
  getProvinceBySlug,
  listMunicipalities,
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

interface Params {
  params: Promise<{ provincia: string; municipio: string }>;
}

/** ISR (H9 §9.4): pre-render known municipalities; with no DB reachable at
    build time this returns [], leaving the route on-demand. */
export async function generateStaticParams(): Promise<{ provincia: string; municipio: string }[]> {
  const municipalities = await safeQuery(() => listMunicipalities(getPublicClient()), []);
  const provinces = await safeQuery(() => listProvinces(getPublicClient()), []);
  const provinceSlug = new Map(provinces.map((p) => [p.id, p.slug]));
  return municipalities
    .filter((m) => provinceSlug.has(m.provinceId))
    .map((m) => ({ provincia: provinceSlug.get(m.provinceId) as string, municipio: m.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { provincia, municipio } = await params;
  const client = getPublicClient();
  const [province, municipality] = await Promise.all([
    safeQuery(() => getProvinceBySlug(client, provincia), null),
    safeQuery(() => getMunicipalityBySlug(client, municipio), null),
  ]);
  const valid = province && municipality && municipality.provinceId === province.id;
  if (!valid) return { title: t.notFound };
  return seoMetadata({
    title: `${municipality.name}, ${province.name}`,
    description: t.companiesIn(municipality.name, 1),
    path: `/p/${province.slug}/${municipality.slug}`,
  });
}

/**
 * Municipality page (task 5.5): the municipality must belong to the province
 * in the URL (composite FK mirrored at routing level). Thin-page guard: 404
 * when unknown, mismatched or empty.
 */
export default async function MunicipalityPage({ params }: Params) {
  const { provincia, municipio } = await params;
  const client = getPublicClient();

  const [province, municipality] = await Promise.all([
    safeQuery(() => getProvinceBySlug(client, provincia), null),
    safeQuery(() => getMunicipalityBySlug(client, municipio), null),
  ]);
  if (!province || !municipality || municipality.provinceId !== province.id) notFound();

  const rows = await safeQuery(
    () => listPublicCompanies(client, { municipalityId: municipality.id }),
    [],
  );
  if (rows.length === 0) notFound();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: d.title, path: '/empresas' },
          { name: province.name, path: `/p/${province.slug}` },
          { name: municipality.name, path: `/p/${province.slug}/${municipality.slug}` },
        ])}
      />
      <p className="text-sm">
        <Link href="/" className="text-gray-600 underline hover:text-ink">
          {es.brand.name}
        </Link>{' '}
        /{' '}
        <Link href={`/p/${province.slug}`} className="text-gray-600 underline hover:text-ink">
          {province.name}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">
        {municipality.name}, {province.name}
      </h1>
      <p className="mt-1 text-sm text-gray-600">{t.companiesIn(municipality.name, rows.length)}</p>

      <div className="mt-6">
        <DualListing
          sectionKey={`municipio-${municipality.id}`}
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
              ariaLabel={`${municipality.name}, ${province.name}`}
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
              ]}
            />
          }
        />
      </div>
    </div>
  );
}
