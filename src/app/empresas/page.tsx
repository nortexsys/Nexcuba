import Link from 'next/link';
import { CompanyCard } from '@/components/public/CompanyCard';
import { DualListing } from '@/components/public/DualListing';
import { DataTable } from '@/components/ui/DataTable';
import { FilterChips } from '@/components/ui/FilterChips';
import {
  countPublicProductsByCompany,
  listActiveSectors,
  listMunicipalities,
  listProvinces,
  listPublicCompanies,
  safeQuery,
} from '@/lib/public/queries';
import { getPublicClient } from '@/lib/supabase/public';
import { filterChips } from '@/lib/url/filters';
import { seoMetadata } from '@/lib/seo/meta';
import { es } from '@/locales/es';

export const dynamic = 'force-dynamic';

export const metadata = seoMetadata({
  title: es.public.directory.title,
  description: es.public.directory.subtitle,
  path: '/empresas',
});

const d = es.public.directory;

/**
 * Companies directory (task 5.2): §12.3 filters as a shareable GET form +
 * dual view (cards/table, D-5). Municipality options are grouped by province
 * so no client JS is needed.
 */
export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{
    tipo?: string;
    sector?: string;
    provincia?: string;
    municipio?: string;
    q?: string;
  }>;
}) {
  const { tipo, sector, provincia, municipio, q } = await searchParams;
  const entityType = ['mipyme', 'cooperative', 'foreign'].includes(tipo ?? '') ? tipo : undefined;
  const sectorSlug = sector || undefined;
  const provinceId = provincia ? Number(provincia) : undefined;
  const municipalityId = municipio ? Number(municipio) : undefined;

  const client = getPublicClient();
  const [rows, sectors, provinces, municipalities] = await Promise.all([
    safeQuery(
      () =>
        listPublicCompanies(client, {
          entityType,
          sectorSlug,
          provinceId,
          municipalityId,
          search: q,
        }),
      [],
    ),
    safeQuery(() => listActiveSectors(client), []),
    safeQuery(() => listProvinces(client), []),
    safeQuery(() => listMunicipalities(client), []),
  ]);
  const productCounts = await safeQuery(
    () =>
      countPublicProductsByCompany(
        client,
        rows.map((row) => row.id),
      ),
    new Map<string, number>(),
  );

  const municipalitiesByProvince = new Map<number, typeof municipalities>();
  for (const municipality of municipalities) {
    const group = municipalitiesByProvince.get(municipality.provinceId) ?? [];
    group.push(municipality);
    municipalitiesByProvince.set(municipality.provinceId, group);
  }

  const chips = filterChips({
    pathname: '/empresas',
    searchParams: { q, tipo, sector, provincia, municipio },
    labels: {
      q: (value) => value,
      tipo: (value) => d.entityType[value as 'mipyme'] ?? value,
      sector: (value) => sectors.find((item) => item.slug === value)?.name ?? value,
      provincia: (value) => provinces.find((item) => item.id === Number(value))?.name ?? value,
      municipio: (value) => municipalities.find((item) => item.id === Number(value))?.name ?? value,
    },
  });

  const selectClass =
    'rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-ink focus:border-ink';

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-bold text-ink">{d.title}</h1>
      <p className="mt-1 text-sm text-gray-600">{d.subtitle}</p>

      <form
        method="get"
        action="/empresas"
        className="mt-6 grid gap-3 rounded-card border border-gray-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-center"
      >
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          {d.search}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder={d.searchPlaceholder}
            className={`${selectClass} rounded-2xl`}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          {d.filters}
          <select name="tipo" defaultValue={entityType ?? ''} className={selectClass}>
            <option value="">{d.allTypes}</option>
            <option value="mipyme">{d.entityType.mipyme}</option>
            <option value="cooperative">{d.entityType.cooperative}</option>
            <option value="foreign">{d.entityType.foreign}</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          {d.filterSector}
          <select name="sector" defaultValue={sectorSlug ?? ''} className={selectClass}>
            <option value="">{d.allSectors}</option>
            {sectors.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          {d.filterProvince}
          <select name="provincia" defaultValue={provinceId ?? ''} className={selectClass}>
            <option value="">{d.allProvinces}</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          {d.filterMunicipality}
          <select name="municipio" defaultValue={municipalityId ?? ''} className={selectClass}>
            <option value="">{d.allMunicipalities}</option>
            {provinces.map((province) => (
              <optgroup key={province.id} label={province.name}>
                {(municipalitiesByProvince.get(province.id) ?? []).map((municipality) => (
                  <option key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {d.apply}
          </button>
          <Link href="/empresas" className="text-xs text-gray-600 underline hover:text-ink">
            {d.reset}
          </Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-gray-600">{d.resultsCount(rows.length)}</p>

      <FilterChips chips={chips} />

      <div className="mt-3">
        <DualListing
          sectionKey="empresas"
          cards={
            rows.length === 0 ? (
              <p className="rounded-card border border-gray-100 bg-white p-6 text-sm text-gray-600">
                {d.empty}
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((company) => (
                  <li key={company.id}>
                    <CompanyCard company={company} productsCount={productCounts.get(company.id)} />
                  </li>
                ))}
              </ul>
            )
          }
          table={
            <DataTable
              ariaLabel={d.title}
              emptyLabel={d.empty}
              rows={rows}
              getRowKey={(row) => row.id}
              getRowHref={(row) => `/empresas/${row.slug}`}
              columns={[
                { key: 'name', header: d.title },
                {
                  key: 'entityType',
                  header: d.filterType,
                  render: (row) => d.entityType[row.entityType as 'mipyme'] ?? row.entityType,
                },
                {
                  key: 'sectorNames',
                  header: 'Sectores',
                  render: (row) => row.sectorNames.join(', ') || '—',
                },
                {
                  key: 'location',
                  header: 'Ubicación',
                  render: (row) =>
                    [row.municipalityName, row.provinceName].filter(Boolean).join(', ') || '—',
                },
                {
                  key: 'createdAt',
                  header: 'Alta',
                  render: (row) => row.createdAt.slice(0, 4),
                },
              ]}
            />
          }
        />
      </div>
    </div>
  );
}
