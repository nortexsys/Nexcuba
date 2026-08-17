import Link from 'next/link';
import { ContentCard } from '@/components/public/ContentCard';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import {
  listPublicContent,
  safeQuery,
  type PublicContentType,
  type PublicContentItem,
} from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

/**
 * Shared builder for the four content sections (task 5.4): per-section search
 * + filters (§12.3 as applicable) and dual view (D-5). Kept in a private
 * folder (no route) and reused by /productos, /servicios, /proyectos and
 * /oportunidades.
 */

const c = es.public.content;

interface SectionCategory {
  id: string;
  slug: string;
  name: string;
}

export interface ContentSectionProps {
  searchParams: Promise<{ q?: string; categoria?: string; cobertura?: string; tipo?: string }>;
}

export function contentSection(type: PublicContentType) {
  const copy = c[type];

  async function ContentSectionPage({ searchParams }: ContentSectionProps) {
    const { q, categoria, cobertura, tipo } = await searchParams;

    const client = getPublicClient();
    const [rows, categories] = await Promise.all([
      safeQuery(
        () =>
          listPublicContent(client, type, {
            search: q,
            categorySlug: categoria || undefined,
            coverage: type === 'services' ? cobertura || undefined : undefined,
            opportunityType: type === 'opportunities' ? tipo || undefined : undefined,
          }),
        [] as PublicContentItem[],
      ),
      safeQuery(async () => {
        if (type !== 'products' && type !== 'services') return [] as SectionCategory[];
        const { data } = await client
          .from('categories')
          .select('id, slug, name')
          .eq('scope', type === 'products' ? 'product' : 'service')
          .eq('is_active', true)
          .order('name');
        return (data ?? []) as SectionCategory[];
      }, [] as SectionCategory[]),
    ]);

    const selectClass =
      'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink focus:border-ink';

    return (
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-bold text-ink">{copy.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{copy.subtitle}</p>

        <form
          method="get"
          action={`/${type}`}
          className="mt-6 flex flex-wrap items-end gap-3 rounded-card border border-gray-100 bg-white p-4"
        >
          <label className="grid gap-1 text-xs font-medium text-gray-600">
            {c.search}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder={c.searchPlaceholder}
              className={`${selectClass} rounded-2xl`}
            />
          </label>
          {categories.length > 0 && (
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              {c.filterCategory}
              <select name="categoria" defaultValue={categoria ?? ''} className={selectClass}>
                <option value="">{c.allCategories}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === 'services' && (
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              {c.filterCoverage}
              <select name="cobertura" defaultValue={cobertura ?? ''} className={selectClass}>
                <option value="">{c.allCoverages}</option>
                {Object.entries(c.coverage).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === 'opportunities' && (
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              {c.filterType}
              <select name="tipo" defaultValue={tipo ?? ''} className={selectClass}>
                <option value="">{c.allTypes}</option>
                {Object.entries(c.opportunityType).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {c.apply}
            </button>
            <Link href={`/${type}`} className="text-xs text-gray-500 underline hover:text-ink">
              {es.public.directory.reset}
            </Link>
          </div>
        </form>

        <p className="mt-6 text-sm text-gray-500">{c.resultsCount(rows.length)}</p>

        <div className="mt-3">
          <DualListing
            sectionKey={type}
            cards={
              rows.length === 0 ? (
                <p className="rounded-card border border-gray-100 bg-white p-6 text-sm text-gray-500">
                  {c.empty}
                </p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((item) => (
                    <li key={item.id}>
                      <ContentCard item={item} type={type} />
                    </li>
                  ))}
                </ul>
              )
            }
            table={
              <DataTable
                ariaLabel={copy.title}
                emptyLabel={c.empty}
                rows={rows}
                getRowKey={(row) => row.id}
                columns={[
                  { key: 'name', header: c.tableName },
                  {
                    key: 'companyName',
                    header: c.byCompany,
                    render: (row) => (
                      <Link
                        href={`/empresas/${row.companySlug}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {row.companyName}
                      </Link>
                    ),
                  },
                  {
                    key: 'detail',
                    header: type === 'products' ? c.filterCategory : c.tableDetail,
                    render: (row) => {
                      if (type === 'products') return row.categoryName ?? '—';
                      if (type === 'services') {
                        const coverageMap = c.coverage as Record<string, string>;
                        return (coverageMap[row.detail] ?? row.detail) || '—';
                      }
                      if (type === 'opportunities') {
                        const typeMap = c.opportunityType as Record<string, string>;
                        return (typeMap[row.detail] ?? row.detail) || '—';
                      }
                      return row.detail || '—';
                    },
                  },
                  {
                    key: 'createdAt',
                    header: c.tableDate,
                    render: (row) => new Date(row.createdAt).toLocaleDateString('es-ES'),
                  },
                ]}
              />
            }
          />
        </div>
      </main>
    );
  }

  return ContentSectionPage;
}
