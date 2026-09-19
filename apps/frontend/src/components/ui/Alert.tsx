import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
};

/**
 * Banner en contexto para errores de negocio y avisos (ej. `ReprocessAlert`
 * del módulo Calidad). No reemplaza el `ErrorState` de una tabla vacía por
 * error de red -- ese caso usa `ErrorState`.
 */
export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-4 py-3 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
