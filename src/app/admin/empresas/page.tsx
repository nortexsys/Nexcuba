import { FilterTabs } from '@/components/admin/FilterTabs';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import type { CompanyStatus } from '@/lib/auth/session';
import { listCompanies } from '@/lib/server/backoffice/companies';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const c = es.auth.admin.companies;

const STATUS_VALUES: CompanyStatus[] = ['pending', 'approved', 'rejected'];
const TYPE_VALUES = ['mipyme', 'cooperative', 'foreign'] as const;

/** Companies management list (task 4.3). */
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tipo?: string; q?: string }>;
}) {
  const { estado, tipo, q } = await searchParams;
  const status = STATUS_VALUES.includes(estado as CompanyStatus)
    ? (estado as CompanyStatus)
    : undefined;
  const entityType = (TYPE_VALUES as readonly string[]).includes(tipo ?? '') ? tipo : undefined;

  const supabase = await getServerClient();
  const rows = await listCompanies(supabase, { status, entityType, search: q });

  const tabHref = (value: string) =>
    `/admin/empresas?estado=${value}${tipo ? `&tipo=${tipo}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold">{c.title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs
          label={c.title}
          current={status ?? 'all'}
          options={[
            { value: 'all', label: c.filter.all },
            { value: 'pending', label: c.filter.pending },
            { value: 'approved', label: c.filter.approved },
            { value: 'rejected', label: c.filter.rejected },
          ]}
          hrefFor={tabHref}
        />
        <form method="get" action="/admin/empresas" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="estado" value={status ?? 'all'} />
          <label className="sr-only" htmlFor="tipo">
            {c.typeFilter.all}
          </label>
          <select
            id="tipo"
            name="tipo"
            defaultValue={entityType ?? ''}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink focus:border-ink"
          >
            <option value="">{c.typeFilter.all}</option>
            {TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {c.typeFilter[type]}
              </option>
            ))}
          </select>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder={c.searchPlaceholder}
            aria-label={c.search}
            className="w-64 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink placeholder:text-gray-400 focus:border-ink"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {c.search}
          </button>
        </form>
      </div>

      <DataTable
        ariaLabel={c.title}
        emptyLabel={c.empty}
        rows={rows}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `/admin/empresas/${row.id}`}
        columns={[
          { key: 'legalName', header: c.table.name },
          {
            key: 'entityType',
            header: c.table.type,
            render: (row) => c.entityType[row.entityType as 'mipyme'] ?? row.entityType,
          },
          {
            key: 'status',
            header: c.table.status,
            render: (row) => <Badge>{c.status[row.status]}</Badge>,
          },
          {
            key: 'isFeatured',
            header: c.table.featured,
            render: (row) => (row.isFeatured ? <Badge variant="verified">★</Badge> : '—'),
          },
          {
            key: 'premiumUntil',
            header: c.table.premium,
            render: (row) =>
              row.premiumUntil && new Date(row.premiumUntil).getTime() > Date.now() ? (
                <Badge variant="premium">{c.premiumUntil(row.premiumUntil.slice(0, 10))}</Badge>
              ) : (
                c.premiumNone
              ),
          },
          {
            key: 'completeness',
            header: c.table.completeness,
            render: (row) => `${row.completeness}%`,
          },
          {
            key: 'createdAt',
            header: c.table.date,
            render: (row) => new Date(row.createdAt).toLocaleDateString('es-ES'),
          },
        ]}
      />
    </section>
  );
}
