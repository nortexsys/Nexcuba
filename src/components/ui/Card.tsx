import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** When provided, the whole card becomes a link. */
  href?: string;
}

/** Flat card: white, radius 16px, 1px gray-100 border, no shadow (design-spec §5). */
export function Card({ children, className, href }: CardProps) {
  const classes = cn(
    'block rounded-card border border-gray-100 bg-white p-6 transition-colors',
    href && 'hover:border-gray-200',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
