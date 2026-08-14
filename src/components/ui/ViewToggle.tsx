'use client';

import { cn } from '@/lib/utils/cn';

export type ViewMode = 'cards' | 'table';

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  cardsLabel: string;
  tableLabel: string;
  legendLabel: string;
  className?: string;
}

/**
 * Segmented pill control to switch a listing between card grid and table view
 * (dual list view, decision D-5 / spec public-directory). Radiogroup pattern
 * for a11y.
 */
export function ViewToggle({
  value,
  onChange,
  cardsLabel,
  tableLabel,
  legendLabel,
  className,
}: ViewToggleProps) {
  const optionClasses = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors',
      active ? 'bg-ink text-white' : 'text-gray-600 hover:text-ink',
    );

  return (
    <div
      role="radiogroup"
      aria-label={legendLabel}
      className={cn('inline-flex items-center gap-1 rounded-full bg-cream-50 p-1', className)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'cards'}
        className={optionClasses(value === 'cards')}
        onClick={() => onChange('cards')}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
          <rect x="1" y="1" width="6" height="6" rx="1.5" />
          <rect x="9" y="1" width="6" height="6" rx="1.5" />
          <rect x="1" y="9" width="6" height="6" rx="1.5" />
          <rect x="9" y="9" width="6" height="6" rx="1.5" />
        </svg>
        {cardsLabel}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'table'}
        className={optionClasses(value === 'table')}
        onClick={() => onChange('table')}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
          <rect x="1" y="2" width="14" height="3" rx="1.5" />
          <rect x="1" y="6.5" width="14" height="3" rx="1.5" />
          <rect x="1" y="11" width="14" height="3" rx="1.5" />
        </svg>
        {tableLabel}
      </button>
    </div>
  );
}
