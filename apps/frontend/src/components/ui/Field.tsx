import { cloneElement, isValidElement, useId, type ReactElement } from 'react';

import { cn } from '@/lib/cn';

interface FieldControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactElement<FieldControlProps>;
  className?: string;
}

/**
 * Envuelve un único control de formulario (input, select, ClientCombobox…)
 * y le inyecta `id` / `aria-describedby` / `aria-invalid`, para no repetir
 * el cableado de accesibilidad en cada campo de cada `NewRequestDialog`.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint && !error && hintId, error && errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {isValidElement(children)
        ? cloneElement(children, {
            id: inputId,
            'aria-describedby': describedBy || undefined,
            'aria-invalid': Boolean(error),
          })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
