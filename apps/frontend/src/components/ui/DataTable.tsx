import { useMemo, type ReactNode } from 'react';

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
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: T) => ReactNode;
  readonly className?: string;
}

export interface DataTableProps<T> {
  readonly columns: DataTableColumn<T>[];
  readonly rows: T[];
  readonly getRowKey: (row: T) => string;
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly className?: string;
}

const SKELETON_ROWS = 3;

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  emptyMessage = 'No hay resultados.',
  className,
}: DataTableProps<T>) {
  const skeletonRowKeys = useMemo(
    () =>
      Array.from({ length: SKELETON_ROWS }, (_, index) => `skeleton-${index}`),
    [],
  );

  let body: ReactNode;
  if (isLoading) {
    body = skeletonRowKeys.map((rowKey) => (
      <TableRow key={rowKey}>
        {columns.map((column) => (
          <TableCell key={column.key}>
            <Skeleton className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (rows.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={columns.length}>
          <EmptyState title={emptyMessage} />
        </TableCell>
      </TableRow>
    );
  } else {
    body = rows.map((row) => (
      <TableRow key={getRowKey(row)}>
        {columns.map((column) => (
          <TableCell key={column.key} className={column.className}>
            {column.render(row)}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

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
      <TableBody>{body}</TableBody>
    </Table>
  );
}
