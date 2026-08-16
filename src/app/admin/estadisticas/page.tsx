import { getStatsCounters, getStatsEvolution } from '@/lib/server/backoffice/stats';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

const s = es.auth.admin.stats;

const SERIES_COLORS: Record<string, string> = {
  companies: 'bg-ink',
  products: 'bg-gold',
  services: 'bg-cream-300',
  projects: 'bg-gray-500',
  opportunities: 'bg-cream-200',
};

/** Statistics dashboard (task 4.8): Fase 1 counters + evolution chart. */
export default async function StatsPage() {
  const supabase = await getServerClient();
  const [counters, evolution] = await Promise.all([
    getStatsCounters(supabase),
    getStatsEvolution(supabase),
  ]);

  if (!counters) {
    return (
      <section className="grid gap-6">
        <h1 className="text-2xl font-bold">{s.title}</h1>
        <p className="rounded-card border border-gray-200 bg-white p-6 text-sm text-gray-500">
          {s.unavailable}
        </p>
      </section>
    );
  }

  const groups = [
    {
      title: s.groups.companies,
      items: [
        [s.counters.companiesTotal, counters.companies_total],
        [s.counters.companiesVerified, counters.companies_verified],
        [s.counters.mipyymes, counters.mipyemes],
        [s.counters.cooperatives, counters.cooperatives],
        [s.counters.foreignFree, counters.foreign_free],
        [s.counters.foreignPremium, counters.foreign_premium],
      ],
    },
    {
      title: s.groups.content,
      items: [
        [s.counters.products, counters.products_published],
        [s.counters.services, counters.services_published],
        [s.counters.projects, counters.projects_published],
        [s.counters.opportunities, counters.opportunities_published],
      ],
    },
    {
      title: s.groups.networking,
      items: [
        [s.counters.contactRequests, counters.contact_requests_total],
        [s.counters.pendingRequests, counters.contact_requests_pending],
        [s.counters.establishedContacts, counters.contacts_established],
      ],
    },
  ] as const;

  const series = [
    { key: 'companies', value: (point: (typeof evolution)[number]) => point.companies_created },
    { key: 'products', value: (point: (typeof evolution)[number]) => point.products_created },
    { key: 'services', value: (point: (typeof evolution)[number]) => point.services_created },
    { key: 'projects', value: (point: (typeof evolution)[number]) => point.projects_created },
    {
      key: 'opportunities',
      value: (point: (typeof evolution)[number]) => point.opportunities_created,
    },
  ];
  const maxValue = Math.max(
    1,
    ...evolution.flatMap((point) => series.map((line) => line.value(point))),
  );

  return (
    <section className="grid gap-8">
      <h1 className="text-2xl font-bold">{s.title}</h1>

      {groups.map((group) => (
        <div key={group.title} className="rounded-card border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {group.title}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {group.items.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-cream-50 px-4 py-3">
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="mt-1 text-2xl font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <div className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {s.evolution}
        </h2>
        {evolution.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{es.common.empty}</p>
        ) : (
          <>
            <ul className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              {series.map((line) => (
                <li key={line.key} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${SERIES_COLORS[line.key]}`}
                  />
                  {s.evolutionLegend[line.key as 'companies']}
                </li>
              ))}
            </ul>
            <div
              role="img"
              aria-label={s.evolution}
              className="mt-4 flex items-end gap-3 overflow-x-auto"
            >
              {evolution.map((point) => (
                <div key={point.month} className="flex w-12 flex-col items-center gap-1">
                  <div className="flex h-40 items-end gap-0.5">
                    {series.map((line) => (
                      <div
                        key={line.key}
                        className={`w-1.5 rounded-t-sm ${SERIES_COLORS[line.key]}`}
                        style={{ height: `${Math.round((line.value(point) / maxValue) * 100)}%` }}
                        title={`${s.evolutionLegend[line.key as 'companies']}: ${line.value(point)}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">{point.month.slice(0, 7)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
