import React from 'react'


export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  caption?: string;
  className?: string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  caption,
  className = '',
  emptyMessage = 'No hay datos disponibles',
}: TableProps<T>) {
  return (
    <div
      className={`w-full overflow-x-auto rounded-2xl bg-neutral-light p-4 shadow-sm border border-slate-200/60 ${className}`}
    >
      <table className="w-full text-left border-collapse">
        {/* Caption oculto para lectores de pantalla (Accesibilidad WCAG) */}
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-200/80">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider text-neutral-dark ${
                  col.className || ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/60 text-base leading-6 font-normal text-neutral-dark">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-slate-200/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-4 px-4 align-middle ${col.className || ''}`}
                  >
                    {/* Renderiza celda mediante función custom o directamente el valor del objeto */}
                    {col.render
                      ? col.render(row)
                      : (row[col.key as keyof T] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

