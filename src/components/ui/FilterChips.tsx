import Link from 'next/link';
import type { FilterChip } from '@/lib/url/filters';
import { es } from '@/locales/es';

/**
 * Active section filters as removable chips (task 7.3). Every chip is a plain
 * link that drops exactly one query param, so filter state stays in the URL —
 * shareable and back-button safe, no client JS required.
 */
export function FilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;
  return (
    <nav aria-label={es.common.filterChips} className="mt-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
        >
          {chip.label}
          <Link
            href={chip.removeHref}
            aria-label={es.common.removeFilter(chip.label)}
            className="text-gray-400 transition-colors hover:text-ink"
          >
            ×
          </Link>
        </span>
      ))}
    </nav>
  );
}
