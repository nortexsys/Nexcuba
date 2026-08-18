import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { CompanyCard } from '@/components/public/CompanyCard';
import { Button } from '@/components/ui/Button';
import { seoMetadata } from '@/lib/seo/meta';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/json-ld';
import {
  getFeaturedCompanies,
  getHomeStats,
  listActiveSectors,
  safeQuery,
  type HomeStats,
} from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { es } from '@/locales/es';

export const revalidate = 300;

export const metadata = seoMetadata({
  title: `${es.brand.name} — ${es.brand.tagline}`,
  description: es.footer.description,
  path: '/',
});

const EMPTY_STATS: HomeStats = {
  companies: 0,
  products: 0,
  services: 0,
  projects: 0,
  opportunities: 0,
};

/** Home (task 5.1): dark hero, stats band, sectors, featured, how-it-works, CTA. */
export default async function HomePage() {
  // getPublicClient() throws without env; it must stay inside each safeQuery
  // so the static build (and CI) can prerender the home page in degraded mode.
  const [stats, sectors, featured] = await Promise.all([
    safeQuery(() => getHomeStats(getPublicClient()), EMPTY_STATS),
    safeQuery(() => listActiveSectors(getPublicClient()), []),
    safeQuery(() => getFeaturedCompanies(getPublicClient()), []),
  ]);

  const statCards = [
    { label: es.home.stats.companies, value: stats.companies, tint: 'bg-cream-50' },
    { label: es.home.stats.products, value: stats.products, tint: 'bg-cream-100' },
    { label: es.home.stats.services, value: stats.services, tint: 'bg-[#E8EDE8]' },
    { label: es.home.stats.projects, value: stats.projects, tint: 'bg-[#EDE8E8]' },
    { label: es.home.stats.opportunities, value: stats.opportunities, tint: 'bg-cream-50' },
  ];

  return (
    <div>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      {/* Hero oscuro (design-spec §6): H1 72px/800 en dos líneas */}
      <section className="bg-ink-deep py-20 text-center text-white md:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-[72px] md:leading-[72px] md:-tracking-[0.025em]">
            {es.home.heroTitleLine1}
            <br />
            {es.home.heroTitleLine2}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/60 md:text-lg">
            {es.home.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="light" size="lg" href="/empresas">
              {es.home.heroCta}
            </Button>
            <Link
              href="/registro"
              className="rounded-full bg-white/10 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/20"
            >
              {es.home.heroSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Banda de estadísticas */}
      <section aria-labelledby="home-stats" className="mx-auto max-w-7xl px-6 py-12">
        <h2 id="home-stats" className="text-sm font-semibold uppercase tracking-wide text-gray-600">
          {es.home.statsTitle}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-card ${card.tint} px-5 py-6 text-center`}>
              <dd className="text-3xl font-bold text-ink">{card.value}</dd>
              <dt className="mt-1 text-xs text-gray-600">{card.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Sectores */}
      <section aria-labelledby="home-sectors" className="mx-auto max-w-7xl px-6 pb-12">
        <h2 id="home-sectors" className="text-2xl font-bold text-ink">
          {es.home.sectorsTitle}
        </h2>
        {sectors.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">{es.common.empty}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {sectors.slice(0, 10).map((sector) => (
              <li key={sector.id}>
                <Link
                  href={`/sectores/${sector.slug}`}
                  className="block rounded-card border border-gray-100 bg-white p-5 text-sm font-medium text-ink transition-colors hover:border-gray-200"
                >
                  {sector.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Empresas destacadas */}
      {featured.length > 0 && (
        <section aria-labelledby="home-featured" className="bg-cream-100 py-12">
          <div className="mx-auto max-w-7xl px-6">
            <h2 id="home-featured" className="text-2xl font-bold text-ink">
              {es.home.featuredTitle}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((company) => (
                <li key={company.id}>
                  <CompanyCard company={company} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section aria-labelledby="home-how" className="mx-auto max-w-7xl px-6 py-12">
        <h2 id="home-how" className="text-2xl font-bold text-ink">
          {es.home.howTitle}
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {es.home.howSteps.map((step, index) => (
            <li key={step.title} className="rounded-card border border-gray-100 bg-white p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-card bg-ink-deep p-10 text-center text-white">
          <h2 className="text-2xl font-bold">{es.home.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">{es.home.ctaBody}</p>
          <div className="mt-6">
            <Button variant="light" size="lg" href="/registro">
              {es.header.register}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
