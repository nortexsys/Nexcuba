import { ActionButton } from '@/components/admin/ActionButton';
import { CreateTaxonomyForm, RenameTaxonomyForm } from '@/components/admin/TaxonomyForms';
import { Badge } from '@/components/ui/Badge';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { createTaxonomyAction, renameTaxonomyAction, toggleTaxonomyAction } from './actions';

export const dynamic = 'force-dynamic';

const t = es.auth.admin.taxonomies;

interface TaxonomyRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  scope?: string;
}

async function fetchTaxonomies(supabase: Awaited<ReturnType<typeof getServerClient>>): Promise<{
  sectors: TaxonomyRow[];
  categories: TaxonomyRow[];
  tags: TaxonomyRow[];
}> {
  const [sectors, categories, tags] = await Promise.all([
    supabase.from('sectors').select('id, name, slug, is_active').order('name'),
    supabase.from('categories').select('id, name, slug, is_active, scope').order('name'),
    supabase.from('tags').select('id, name, slug, is_active').order('name'),
  ]);
  return {
    sectors: (sectors.data ?? []) as TaxonomyRow[],
    categories: (categories.data ?? []) as TaxonomyRow[],
    tags: (tags.data ?? []) as TaxonomyRow[],
  };
}

function TaxonomyTable({
  kind,
  rows,
  withScope = false,
}: {
  kind: 'sector' | 'category' | 'tag';
  rows: TaxonomyRow[];
  withScope?: boolean;
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{t.empty}</p>;

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th
            scope="col"
            className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            {t.name}
          </th>
          {withScope && (
            <th
              scope="col"
              className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              {t.scope}
            </th>
          )}
          <th
            scope="col"
            className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            {t.slug}
          </th>
          <th
            scope="col"
            className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            {t.active}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
            <td className="px-2 py-2">
              <RenameTaxonomyForm
                action={renameTaxonomyAction}
                id={row.id}
                currentName={row.name}
              />
            </td>
            {withScope && (
              <td className="px-2 py-2 text-gray-600">
                {row.scope === 'service' ? t.scopeService : t.scopeProduct}
              </td>
            )}
            <td className="px-2 py-2 text-gray-400">{row.slug}</td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-2">
                {row.is_active ? (
                  <Badge variant="verified">{t.active}</Badge>
                ) : (
                  <Badge>{t.inactive}</Badge>
                )}
                <ActionButton
                  action={toggleTaxonomyAction}
                  fields={{ kind, id: row.id, next: row.is_active ? 'off' : 'on' }}
                  label={row.is_active ? t.deactivate : t.activate}
                  compact
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Taxonomies manager (task 4.5): CRUD + soft-deactivate. */
export default async function TaxonomiesPage() {
  const supabase = await getServerClient();
  const { sectors, categories, tags } = await fetchTaxonomies(supabase);

  const sections = [
    {
      key: 'sector' as const,
      title: t.sectors,
      rows: sectors,
      withScope: false,
    },
    {
      key: 'category' as const,
      title: t.categories,
      rows: categories,
      withScope: true,
    },
    { key: 'tag' as const, title: t.tags, rows: tags, withScope: false },
  ];

  return (
    <section className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.hint}</p>
      </div>

      {sections.map((section) => (
        <div key={section.key} className="rounded-card border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold">{section.title}</h2>
          <div className="mt-3">
            <CreateTaxonomyForm
              action={createTaxonomyAction}
              kind={section.key}
              withScope={section.withScope}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <TaxonomyTable kind={section.key} rows={section.rows} withScope={section.withScope} />
          </div>
        </div>
      ))}
    </section>
  );
}
