import { cn } from '@/lib/cn';

import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Ocurrió un error',
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-12 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-red-700">{title}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      )}
    </div>
  );
}
