import { ContentManager } from '@/components/portal/ContentManager';
import type { PortalContentType } from '@/lib/server/portal/content';
import { listOwnContent } from '@/lib/server/portal/content';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import {
  addContentImageAction,
  deleteContentAction,
  removeContentImageAction,
  saveContentAction,
} from '@/app/portal/actions';

/**
 * Shared builder for the four OWN-content portal sections (task 6.3):
 * /portal/productos, /portal/servicios, /portal/proyectos and
 * /portal/oportunidades. Kept in the private _shared folder (no route),
 * mirroring the H5 public content-section factory.
 */

const TITLES: Record<PortalContentType, { title: string; subtitle: string }> = {
  products: es.public.content.products,
  services: es.public.content.services,
  projects: es.public.content.projects,
  opportunities: es.public.content.opportunities,
};

interface PortalCategory {
  id: string;
  name: string;
}

export function portalContentSection(type: PortalContentType) {
  async function PortalContentPage() {
    const supabase = await getServerClient();

    // Own company from the session profile — never from the URL.
    const { data: profile } = await supabase.from('profiles').select('company_id').maybeSingle();
    const companyId = (profile as Record<string, unknown> | null)?.company_id as string | null;

    const [items, categories] = await Promise.all([
      companyId ? listOwnContent(supabase, companyId, type) : Promise.resolve([]),
      type === 'products' || type === 'services'
        ? fetchCategories(supabase, type)
        : ([] as PortalCategory[]),
    ]);

    const copy = TITLES[type];

    return (
      <section className="grid gap-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">{copy.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{copy.subtitle}</p>
        </div>
        <ContentManager
          type={type}
          items={items}
          categories={categories}
          saveAction={saveContentAction}
          deleteAction={deleteContentAction}
          addImageAction={addContentImageAction}
          removeImageAction={removeContentImageAction}
        />
      </section>
    );
  }

  return PortalContentPage;
}

async function fetchCategories(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  type: 'products' | 'services',
): Promise<PortalCategory[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('scope', type === 'products' ? 'product' : 'service')
    .eq('is_active', true)
    .order('name');
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}
