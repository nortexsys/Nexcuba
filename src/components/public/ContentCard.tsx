import Link from 'next/link';
import type { PublicContentType, PublicContentItem } from '@/lib/public/queries';
import { es } from '@/locales/es';

/**
 * Content card for the public sections (products/services/projects/
 * opportunities). The card links to the responsible company's ficha —
 * per-entity detail pages are not part of Fase 1 (task 5.4).
 */
export function ContentCard({ item, type }: { item: PublicContentItem; type: PublicContentType }) {
  const c = es.public.content;

  const coverageMap = c.coverage as Record<string, string>;
  const opportunityMap = c.opportunityType as Record<string, string>;

  const detailLabel = (): string | null => {
    if (type === 'services' && item.detail) return coverageMap[item.detail] ?? item.detail;
    if (type === 'opportunities' && item.detail) {
      return opportunityMap[item.detail] ?? item.detail;
    }
    if (type === 'projects' && item.detail) return `${c.projectStatus}: ${item.detail}`;
    if (type === 'products' && item.categoryName) return item.categoryName;
    return null;
  };
  const badge = detailLabel();

  return (
    <article className="flex h-full flex-col rounded-card border border-gray-100 bg-white p-6 transition-colors hover:border-gray-200">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{item.name}</h3>
        {badge && (
          <span className="shrink-0 rounded-full bg-cream-50 px-2.5 py-0.5 text-xs text-gray-600">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {c.byCompany}:{' '}
        <Link
          href={`/empresas/${item.companySlug}`}
          className="font-medium text-ink hover:underline"
        >
          {item.companyName}
        </Link>
      </p>

      {item.description && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">{item.description}</p>
      )}

      <p className="mt-auto pt-4 text-xs text-gray-400">
        {new Date(item.createdAt).toLocaleDateString('es-ES')}
      </p>
    </article>
  );
}
