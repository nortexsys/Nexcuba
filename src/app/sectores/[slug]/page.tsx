import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyCard } from '@/components/public/CompanyCard';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import { getSectorBySlug, listPublicCompanies, safeQuery } from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const s = es.public.sectors;
const d = es.public.directory;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sector = await safeQuery(() => getSectorBySlug(getPublicClient(), slug), null);
  return { title: sector ? `${sector.name} · ${es.brand.name}` : s.notFound };
}

/**
 * Sector page (task 5.5): approved companies of the sector. Thin-page guard
 * (funcional §24): unknown or empty sectors render 404 instead of an
 * indexable empty listing.
 */
export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = getPublicClient();

  const sector = await safeQuery(() => getSectorBySlug(client, slug), null);
  if (!sector) notFound();

  const rows = await safeQuery(() => listPublicCompanies(client, { sectorSlug: slug }), []);
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
      <h1 className="mt-2 text-3xl font-bold text-ink">{sector.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{s.companiesIn(sector.name, rows.length)}</p>

      <div className="mt-6">
        <DualListing
          sectionKey={`sector-${slug}`}
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
              ariaLabel={sector.name}
              emptyLabel={s.empty}
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
