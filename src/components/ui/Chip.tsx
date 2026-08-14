import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

/** Filter/category chip: white pill, active state inverts to dark (design-spec §5). */
export function Chip({ active = false, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-normal transition-colors',
        active ? 'bg-ink text-white' : 'bg-white text-gray-700 hover:bg-gray-100',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
