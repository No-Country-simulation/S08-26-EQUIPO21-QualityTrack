import { cn } from '@/lib/cn';

import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>
      <p className="text-sm text-gray-600" aria-live="polite">
        Página {page} de {totalPages}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </Button>
    </nav>
  );
}
