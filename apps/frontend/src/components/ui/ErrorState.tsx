import { cn } from 'cn';

import { Button } from './base/button';

export interface ErrorStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
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
      <p className="text-sm font-medium text-destructive">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      )}
    </div>
  );
}
