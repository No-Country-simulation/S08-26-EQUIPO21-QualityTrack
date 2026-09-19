import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Placeholder de carga con la forma del contenido real (ver contrato de
 * estados en docs/frontend-structure.md §5) -- nunca un spinner suelto.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn('animate-pulse rounded bg-gray-200', className)}
      {...props}
    />
  );
}
