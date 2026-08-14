import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeVariant = 'verified' | 'premium' | 'neutral';

const variantClasses: Record<BadgeVariant, string> = {
  verified: 'bg-cream-50 text-gray-700 border-gray-200',
  premium: 'bg-gold/20 text-ink border-gold/60',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Small pill badge (verified / premium / meta) — design-spec §5. */
export function Badge({ variant = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
