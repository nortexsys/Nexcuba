import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'primary' | 'ghost' | 'light';
export type ButtonSize = 'sm' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  // Dark pill — primary action (design-spec §5)
  primary: 'bg-ink text-white hover:bg-gray-800',
  // Transparent pill — secondary action
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  // White pill over dark hero — inverted CTA
  light: 'bg-white text-ink hover:bg-gray-100',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-6 py-3 text-sm font-medium',
  lg: 'px-8 py-4 text-base font-semibold',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When provided, renders a Next.js Link styled as a button. */
  href?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'sm',
  href,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
