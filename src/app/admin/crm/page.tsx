import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { listCrmRecords } from '@/lib/server/backoffice/crm';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const crm = es.auth.admin.crm;

/** CRM overview (task 4.9): internal-only digitalization records. */
export default async function CrmPage() {
  const supabase = await getServerClient();
  const rows = await listCrmRecords(supabase);

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold">{crm.title}</h1>

      <DataTable
        ariaLabel={crm.title}
        emptyLabel={crm.empty}
        rows={rows}
        getRowKey={(row) => row.companyId}
        getRowHref={(row) => `/admin/empresas/${row.companyId}`}
        columns={[
          { key: 'companyName', header: crm.table.company },
          {
            key: 'completenessSnapshot',
            header: crm.table.completeness,
            render: (row) => `${row.completenessSnapshot}%`,
          },
          {
            key: 'commercialPotential',
            header: crm.table.potential,
            render: (row) => (
              <Badge variant="verified">{crm.potential[row.commercialPotential]}</Badge>
            ),
          },
          {
            key: 'followupStatus',
            header: crm.table.followup,
            render: (row) => row.followupStatus ?? '—',
          },
          {
            key: 'updatedAt',
            header: crm.table.updated,
            render: (row) => new Date(row.updatedAt).toLocaleDateString('es-ES'),
          },
          {
            key: 'actions',
            header: crm.table.actions,
            render: (row) => (
              <Link
                href={`/admin/empresas/${row.companyId}`}
                className="text-sm font-medium text-ink underline"
              >
                {crm.openCompany}
              </Link>
            ),
          },
        ]}
      />
    </section>
  );
}
