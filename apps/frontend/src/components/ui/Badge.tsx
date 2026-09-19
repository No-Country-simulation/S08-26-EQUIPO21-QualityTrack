import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type BadgeVariant =
  'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

/**
 * Badge genérico, sin conocimiento de negocio. `StatusBadge` (issue FE-03)
 * se construye sobre este componente y sobre `domain/*Status` para mapear
 * los estados de `QUOTE` y `WORK_ORDER` a una variante.
 */
export function Badge({
  variant = 'neutral',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
