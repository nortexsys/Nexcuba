import { ActionButton } from '@/components/admin/ActionButton';
import { FilterTabs } from '@/components/admin/FilterTabs';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import {
  CONTENT_TYPES,
  isContentType,
  listContent,
  type ContentType,
} from '@/lib/server/backoffice/content';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { deleteContentAction, setVisibilityAction } from './actions';

export const dynamic = 'force-dynamic';

const c = es.auth.admin.content;

/** Content oversight (task 4.6): browse, hide/unhide, delete. */
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; vis?: string; q?: string }>;
}) {
  const { tipo, vis, q } = await searchParams;
  const tipoParam = tipo ?? '';
  const type: ContentType = isContentType(tipoParam) ? tipoParam : 'products';
  const hidden = vis === 'hidden' ? true : vis === 'visible' ? false : undefined;

  const supabase = await getServerClient();
  const rows = await listContent(supabase, type, { hidden, search: q });

  const base = (params: Record<string, string>) => {
    const search = new URLSearchParams(params);
    if (q) search.set('q', q);
    return `/admin/contenido?${search.toString()}`;
  };

  return (
    <section className="grid gap-6">
      <h1 className="text-2xl font-bold">{c.title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-2">
          <FilterTabs
            label={c.title}
            current={type}
            options={CONTENT_TYPES.map((value) => ({ value, label: c.types[value] }))}
            hrefFor={(value) => base({ tipo: value, ...(vis ? { vis } : {}) })}
          />
          <FilterTabs
            label={c.filter.all}
            current={vis ?? 'all'}
            options={[
              { value: 'all', label: c.filter.all },
              { value: 'visible', label: c.filter.visible },
              { value: 'hidden', label: c.filter.hidden },
            ]}
            hrefFor={(value) => base({ tipo: type, ...(value === 'all' ? {} : { vis: value }) })}
          />
        </div>
        <form method="get" action="/admin/contenido" className="flex items-center gap-2">
          <input type="hidden" name="tipo" value={type} />
          {vis && vis !== 'all' && <input type="hidden" name="vis" value={vis} />}
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
        ariaLabel={c.types[type]}
        emptyLabel={c.empty}
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          { key: 'name', header: c.table.name },
          { key: 'companyName', header: c.table.company },
          { key: 'detail', header: c.table.detail },
          {
            key: 'hidden',
            header: c.table.visibility,
            render: (row) =>
              row.hidden ? <Badge variant="premium">{c.hidden}</Badge> : <Badge>{c.visible}</Badge>,
          },
          {
            key: 'createdAt',
            header: c.table.date,
            render: (row) => new Date(row.createdAt).toLocaleDateString('es-ES'),
          },
          {
            key: 'actions',
            header: c.table.actions,
            render: (row) => (
              <div className="flex flex-wrap items-start gap-2">
                <ActionButton
                  action={setVisibilityAction}
                  fields={{ type, id: row.id, hidden: row.hidden ? 'off' : 'on' }}
                  label={row.hidden ? c.unhide : c.hide}
                  compact
                />
                <ActionButton
                  action={deleteContentAction}
                  fields={{ type, id: row.id }}
                  label={c.remove}
                  danger
                  compact
                  confirmMessage={c.confirmDelete}
                />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
