import { FilterTabs } from '@/components/admin/FilterTabs';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import type { CompanyStatus } from '@/lib/auth/session';
import { listApplications } from '@/lib/server/backoffice/applications';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const a = es.auth.admin.applications;

const STATUS_VALUES: CompanyStatus[] = ['pending', 'approved', 'rejected'];

function statusLabel(status: string): string {
  if (status === 'pending') return a.status.pending;
  if (status === 'approved') return a.status.approved;
  return a.status.rejected;
}

/** Applications inbox (task 4.2): filter + search + list. */
export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;
  const status = STATUS_VALUES.includes(estado as CompanyStatus)
    ? (estado as CompanyStatus)
    : undefined;

  const supabase = await getServerClient();
  const rows = await listApplications(supabase, { status, search: q });

  const tabHref = (value: string) =>
    `/admin/solicitudes?estado=${value}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold">{a.title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs
          label={a.title}
          current={status ?? 'all'}
          options={[
            { value: 'all', label: a.filter.all },
            { value: 'pending', label: a.filter.pending },
            { value: 'approved', label: a.filter.approved },
            { value: 'rejected', label: a.filter.rejected },
          ]}
          hrefFor={tabHref}
        />
        <form method="get" action="/admin/solicitudes" className="flex items-center gap-2">
          <input type="hidden" name="estado" value={status ?? 'all'} />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder={a.searchPlaceholder}
            aria-label={a.search}
            className="w-72 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink placeholder:text-gray-400 focus:border-ink"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {a.search}
          </button>
        </form>
      </div>

      <DataTable
        ariaLabel={a.title}
        emptyLabel={a.empty}
        rows={rows}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `/admin/solicitudes/${row.id}`}
        columns={[
          { key: 'companyName', header: a.table.company },
          { key: 'applicantName', header: a.table.applicant },
          { key: 'applicantEmail', header: a.table.email },
          {
            key: 'entityType',
            header: a.table.type,
            render: (row) =>
              es.auth.admin.companies.entityType[row.entityType as 'mipyme'] ?? row.entityType,
          },
          {
            key: 'status',
            header: a.table.status,
            render: (row) => <Badge>{statusLabel(row.status)}</Badge>,
          },
          {
            key: 'createdAt',
            header: a.table.date,
            render: (row) => new Date(row.createdAt).toLocaleDateString('es-ES'),
          },
        ]}
      />
    </section>
  );
}
