import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentCard } from '@/components/public/ContentCard';
import { DualListing } from '@/components/public/DualListing';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  safeQuery,
  searchAll,
  type PublicContentItem,
  type PublicContentType,
  type SearchEntity,
  type SearchGroup,
  type SearchResultRow,
} from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: es.searchResults.title,
};

const s = es.searchResults;

const CONTENT_TYPE: Partial<Record<SearchEntity, PublicContentType>> = {
  product: 'products',
  service: 'services',
  project: 'projects',
  opportunity: 'opportunities',
};

function mapContentItem(row: SearchResultRow): PublicContentItem {
  return {
    id: row.id,
    name: row.title,
    description: row.description,
    createdAt: row.created_at,
    companyName: row.company_name,
    companySlug: row.company_slug,
    detail: '',
    categoryName: null,
  };
}

function CompanyCard({ row }: { row: SearchResultRow }) {
  return (
    <article className="flex h-full flex-col rounded-card border border-gray-100 bg-white p-6 transition-colors hover:border-gray-200">
      <h3 className="text-base font-semibold text-ink">
        <Link href={`/empresas/${row.company_slug}`} className="hover:underline">
          {row.title}
        </Link>
      </h3>
      <span className="mt-1 w-fit rounded-full bg-cream-50 px-2.5 py-0.5 text-xs text-gray-600">
        {s.groupTitles.company}
      </span>
      {row.description && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">{row.description}</p>
      )}
      <p className="mt-auto pt-4 text-xs text-gray-400">
        {new Date(row.created_at).toLocaleDateString('es-ES')}
      </p>
    </article>
  );
}

function GroupSection({ group }: { group: SearchGroup }) {
  const title = s.groupTitles[group.entity];
  const type = CONTENT_TYPE[group.entity];
  const cards = (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {group.items.map((row) => (
        <li key={row.id}>
          {type ? (
            <ContentCard item={mapContentItem(row)} type={type} />
          ) : (
            <CompanyCard row={row} />
          )}
        </li>
      ))}
    </ul>
  );
  const tableColumns: DataTableColumn<SearchResultRow>[] = [
    { key: 'title', header: s.tableName },
    ...(type ? [{ key: 'company_name', header: s.tableCompany }] : []),
    {
      key: 'description',
      header: s.description,
      render: (row) => row.description || '—',
    },
    {
      key: 'created_at',
      header: s.tableDate,
      render: (row) => new Date(row.created_at).toLocaleDateString('es-ES'),
    },
  ];
  const table = (
    <DataTable
      ariaLabel={title}
      emptyLabel={s.empty}
      rows={group.items}
      getRowKey={(row) => row.id}
      getRowHref={(row) => `/empresas/${row.company_slug}`}
      columns={tableColumns}
    />
  );
  return (
    <section aria-labelledby={`search-group-${group.entity}`}>
      <h2
        id={`search-group-${group.entity}`}
        className="flex items-baseline gap-2 text-xl font-bold text-ink"
      >
        {title}
        <span className="text-sm font-normal text-gray-400">{group.items.length}</span>
      </h2>
      <div className="mt-2">
        <DualListing sectionKey={`search-${group.entity}`} cards={cards} table={table} />
      </div>
    </section>
  );
}

/**
 * Global search results (task 7.2): runs `search_all` and renders results
 * grouped by the five entity types, each group with its own dual view
 * (D-5). Only approved/visible rows come out of the RPC; ordering is
 * relevance first, `created_at DESC` as tie-break (design.md §6).
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const client = getPublicClient();
  const groups = await safeQuery(() => searchAll(client, q), [] as SearchGroup[]);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold text-ink">{s.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{q ? s.queryFor(q) : s.emptyQuery}</p>
      <p className="mt-6 text-sm text-gray-500">{s.resultsCount(total)}</p>

      <div className="mt-3 grid gap-8">
        {groups.map((group) => (
          <GroupSection key={group.entity} group={group} />
        ))}
        {groups.length === 0 && (
          <div className="rounded-card border border-gray-100 bg-white p-6 text-sm text-gray-500">
            {s.empty}
            <p className="mt-1 text-xs text-gray-400">{s.emptyHint}</p>
          </div>
        )}
      </div>
    </main>
  );
}
