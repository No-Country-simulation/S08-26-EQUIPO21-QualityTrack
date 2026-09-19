import { cn } from 'cn';
import { cloneElement, isValidElement, useId, type ReactElement } from 'react';

import { Label } from './base/label';

interface FieldControlProps {
  readonly id?: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: boolean;
  readonly 'aria-required'?: boolean;
}

export interface FieldProps {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly children: ReactElement<FieldControlProps>;
  readonly className?: string;
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
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {isValidElement(children)
        ? cloneElement(children, {
            id: inputId,
            'aria-describedby': describedBy || undefined,
            'aria-invalid': Boolean(error),
            'aria-required': required,
          })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
