import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const SKELETON_ROWS = 3;

/**
 * `columns` como datos, no como JSX suelto: cada feature aporta su propio
 * `columns[]` (ver docs/frontend-structure.md §3) sin duplicar el marcado
 * de la tabla ni los estados de carga/vacío.
 */
export function Table<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  emptyMessage = 'No hay resultados.',
  className,
}: TableProps<T>) {
  return (
    <table
      className={cn('w-full border-collapse text-left text-sm', className)}
    >
      <thead>
        <tr className="border-b border-gray-200">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cn(
                'px-3 py-2 font-medium text-gray-500',
                column.className,
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>
              <EmptyState title={emptyMessage} />
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-gray-100 last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-3 py-3', column.className)}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
