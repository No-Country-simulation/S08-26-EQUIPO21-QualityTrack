import type { ReactNode } from 'react';

import { EmptyState } from './EmptyState';
import { Skeleton } from './base/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './base/table';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
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
 * ni los estados de carga/vacío. Ningún primitivo de shadcn/ui o MynaUI
 * ofrece esta abstracción genérica -- son piezas de `<table>` sueltas
 * (`Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`),
 * este wrapper sigue siendo propio del proyecto.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  emptyMessage = 'No hay resultados.',
  className,
}: DataTableProps<T>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <EmptyState title={emptyMessage} />
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
