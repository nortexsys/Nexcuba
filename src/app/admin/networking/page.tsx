import { FilterTabs } from '@/components/admin/FilterTabs';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { listContactRequests } from '@/lib/server/backoffice/networking';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const n = es.auth.admin.networking;

/** Networking consult (task 4.7): read-only listing with statuses. */
export default async function NetworkingPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const status =
    estado === 'pending' || estado === 'accepted' ? (estado as 'pending' | 'accepted') : undefined;

  const supabase = await getServerClient();
  const rows = await listContactRequests(supabase, { status });

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold">{n.title}</h1>

      <FilterTabs
        label={n.title}
        current={status ?? 'all'}
        options={[
          { value: 'all', label: n.filter.all },
          { value: 'pending', label: n.filter.pending },
          { value: 'accepted', label: n.filter.accepted },
        ]}
        hrefFor={(value) => `/admin/networking?estado=${value}`}
      />

      <DataTable
        ariaLabel={n.title}
        emptyLabel={n.empty}
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          { key: 'requesterName', header: n.table.requester },
          { key: 'targetName', header: n.table.target },
          { key: 'subject', header: n.table.subject },
          {
            key: 'status',
            header: n.table.status,
            render: (row) => <Badge>{n.status[row.status]}</Badge>,
          },
          {
            key: 'createdAt',
            header: n.table.date,
            render: (row) => new Date(row.createdAt).toLocaleDateString('es-ES'),
          },
        ]}
      />
    </section>
  );
}
