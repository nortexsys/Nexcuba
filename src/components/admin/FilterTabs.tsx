import Link from 'next/link';

export interface FilterTabOption {
  value: string;
  label: string;
}

/**
 * Query-string filter tabs (server-rendered Links): shareable URLs and
 * back-button-safe by construction (same contract as 7.3 will formalize).
 */
export function FilterTabs({
  options,
  current,
  hrefFor,
  label,
}: {
  options: FilterTabOption[];
  current: string;
  hrefFor: (value: string) => string;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1">
      {options.map((option) => (
        <Link
          key={option.value}
          href={hrefFor(option.value)}
          aria-current={option.value === current ? 'page' : undefined}
          className={
            option.value === current
              ? 'rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white'
              : 'rounded-full px-4 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100'
          }
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
