import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentCard } from '@/components/public/ContentCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  computeNetworkingRight,
  getPublicCompanyBySlug,
  listCompanyGallery,
  listCompanyPublishedContent,
  safeQuery,
  type PublicContentType,
} from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const f = es.public.ficha;
const d = es.public.directory;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await safeQuery(() => getPublicCompanyBySlug(getPublicClient(), slug), null);
  return { title: company ? `${company.name} · ${es.brand.name}` : f.notFound };
}

/** Public company ficha (task 5.3, spec public-directory: ficha §9 completa). */
export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = getPublicClient();

  const company = await safeQuery(() => getPublicCompanyBySlug(client, slug), null);
  if (!company) notFound();

  const [gallery, content, viewer] = await Promise.all([
    safeQuery(() => listCompanyGallery(client, company.id), []),
    safeQuery(() => listCompanyPublishedContent(client, company.id), {
      products: [],
      services: [],
      projects: [],
      opportunities: [],
    }),
    // Viewer check uses the session client (cookies); anonymous → null.
    safeQuery(async () => {
      const server = await getServerClient();
      const {
        data: { user },
      } = await server.auth.getUser();
      if (!user) return null;
      const { data: profile } = await server
        .from('profiles')
        .select('role, companies(entity_type, status, premium_until)')
        .maybeSingle();
      const relation = profile?.companies as
        | { entity_type?: string; status?: string; premium_until?: string | null }
        | { entity_type?: string; status?: string; premium_until?: string | null }[]
        | null
        | undefined;
      const row = Array.isArray(relation) ? relation[0] : relation;
      return computeNetworkingRight({
        role: (profile?.role as 'company' | 'admin') ?? 'company',
        status: row?.status,
        entityType: row?.entity_type,
        premiumUntil: row?.premium_until ?? null,
      });
    }, false),
  ]);

  const location = [company.municipalityName, company.provinceName].filter(Boolean).join(', ');
  const year = company.createdAt.slice(0, 4);
  const contentGroups: { type: PublicContentType; items: typeof content.products }[] = [
    { type: 'products', items: content.products },
    { type: 'services', items: content.services },
    { type: 'projects', items: content.projects },
    { type: 'opportunities', items: content.opportunities },
  ];
  const hasContent = contentGroups.some((group) => group.items.length > 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Cabecera */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt=""
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-2xl border border-gray-100 object-cover"
            />
          ) : (
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-cream-100 text-2xl font-bold text-gray-500">
              {company.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-3xl font-bold text-ink">{company.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Badge variant="verified">{es.common.verified}</Badge>
              {d.entityType[company.entityType as 'mipyme'] ?? company.entityType}
              <span aria-hidden="true">·</span>
              {f.since(year)}
            </p>
          </div>
        </div>
        {viewer && (
          <Button href={`/portal/contactos?empresa=${company.slug}`}>{f.internalContact}</Button>
        )}
      </header>

      {/* Sectores + territorio */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-gray-100 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {f.sectors}
          </h2>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {company.sectorNames.length === 0 ? (
              <span className="text-sm text-gray-400">—</span>
            ) : (
              company.sectorNames.map((sector) => (
                <span
                  key={sector}
                  className="rounded-full bg-cream-50 px-3 py-1 text-xs text-gray-700"
                >
                  {sector}
                </span>
              ))
            )}
          </p>
        </div>
        <div className="rounded-card border border-gray-100 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {f.location}
          </h2>
          <p className="mt-2 text-sm text-gray-700">{location || '—'}</p>
          {company.address && <p className="mt-1 text-sm text-gray-500">{company.address}</p>}
        </div>
      </section>

      {/* Descripción */}
      {company.description && (
        <section className="mt-4 rounded-card border border-gray-100 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {f.description}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{company.description}</p>
        </section>
      )}

      {/* Contacto público */}
      <section className="mt-4 rounded-card border border-gray-100 bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{f.contact}</h2>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-gray-500">{f.phone}</dt>
            <dd>{company.phone ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-gray-500">{f.email}</dt>
            <dd>{company.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-gray-500">{f.website}</dt>
            <dd>
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-ink"
                >
                  {company.website}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-gray-500">{f.socials}</dt>
            <dd>
              {company.socials.length === 0
                ? '—'
                : company.socials.map((social) => (
                    <a
                      key={social.url}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-2 capitalize underline hover:text-ink"
                    >
                      {social.platform}
                    </a>
                  ))}
            </dd>
          </div>
        </dl>
        {viewer && <p className="mt-3 text-xs text-gray-400">{f.internalContactHint}</p>}
      </section>

      {/* Galería */}
      {gallery.length > 0 && (
        <section className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {f.gallery}
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((image) => (
              <li key={image.url} className="overflow-hidden rounded-2xl border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt ?? ''} className="h-32 w-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Contenido publicado */}
      <section className="mt-6">
        <h2 className="text-2xl font-bold text-ink">{f.content}</h2>
        {!hasContent && <p className="mt-3 text-sm text-gray-500">{f.noContent}</p>}
        {contentGroups.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.type} className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {f[group.type]}
                </h3>
                <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <ContentCard item={item} type={group.type} />
                    </li>
                  ))}
                </ul>
              </div>
            ),
        )}
      </section>

      <p className="mt-8 text-sm">
        <Link href="/empresas" className="text-gray-500 underline hover:text-ink">
          ← {d.title}
        </Link>
      </p>
    </main>
  );
}
