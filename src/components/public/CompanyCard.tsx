import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { PublicCompanyCard } from '@/lib/public/queries';
import { es } from '@/locales/es';

const d = es.public.directory;

/**
 * Directory card (spec public-directory ficha/listings): logo, name, verified
 * badge, sectors, location, 2-line description and a compact stats line.
 */
export function CompanyCard({
  company,
  productsCount,
}: {
  company: PublicCompanyCard;
  productsCount?: number;
}) {
  const year = company.createdAt.slice(0, 4);
  const location = [company.municipalityName, company.provinceName].filter(Boolean).join(', ');

  return (
    <article className="flex h-full flex-col rounded-card border border-gray-100 bg-white p-6 transition-colors hover:border-gray-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-2xl border border-gray-100 object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream-100 text-lg font-bold text-gray-500">
              {company.name.charAt(0).toUpperCase() || '?'}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink">
              <Link href={`/empresas/${company.slug}`} className="hover:underline">
                {company.name}
              </Link>
            </h3>
            <p className="text-xs text-gray-500">
              {d.entityType[company.entityType as 'mipyme'] ?? company.entityType}
            </p>
          </div>
        </div>
        <Badge variant="verified">{es.common.verified}</Badge>
      </div>

      {company.description && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">{company.description}</p>
      )}

      {company.sectorNames.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {company.sectorNames.slice(0, 3).map((sector) => (
            <span
              key={sector}
              className="rounded-full bg-cream-50 px-2.5 py-0.5 text-xs text-gray-600"
            >
              {sector}
            </span>
          ))}
        </p>
      )}

      <p className="mt-3 text-xs text-gray-400">{location || '—'}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-gray-500">
        <span>
          {d.memberSince(year)}
          {productsCount !== undefined && productsCount > 0
            ? ` · ${d.productsCount(productsCount)}`
            : ''}
        </span>
        <Link
          href={`/empresas/${company.slug}`}
          className="font-medium text-ink underline hover:no-underline"
        >
          {d.viewProfile}
        </Link>
      </div>
    </article>
  );
}
