import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyCard } from '@/components/public/CompanyCard';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import {
  getMunicipalityBySlug,
  getProvinceBySlug,
  listPublicCompanies,
  safeQuery,
} from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const t = es.public.territory;
const d = es.public.directory;

interface Params {
  params: Promise<{ provincia: string; municipio: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { provincia, municipio } = await params;
  const client = getPublicClient();
  const [province, municipality] = await Promise.all([
    safeQuery(() => getProvinceBySlug(client, provincia), null),
    safeQuery(() => getMunicipalityBySlug(client, municipio), null),
  ]);
  const valid = province && municipality && municipality.provinceId === province.id;
  return {
    title: valid ? `${municipality.name}, ${province.name} · ${es.brand.name}` : t.notFound,
  };
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
    <main className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-sm">
        <Link href="/" className="text-gray-500 underline hover:text-ink">
          {es.brand.name}
        </Link>{' '}
        /{' '}
        <Link href={`/p/${province.slug}`} className="text-gray-500 underline hover:text-ink">
          {province.name}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">
        {municipality.name}, {province.name}
      </h1>
      <p className="mt-1 text-sm text-gray-500">{t.companiesIn(municipality.name, rows.length)}</p>

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
    </main>
  );
}
