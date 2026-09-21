import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
} from '@/components/ui';

import { useApproveQuote, useRejectQuote } from '../hooks';
import { quoteStatusLabel, type QuoteSummary } from '../types';

export interface QuotesTableProps {
  readonly quotes: QuoteSummary[];
  readonly isLoading: boolean;
}

const amountFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function QuotesTable({ quotes, isLoading }: QuotesTableProps) {
  const approveQuote = useApproveQuote();
  const rejectQuote = useRejectQuote();

  const columns: DataTableColumn<QuoteSummary>[] = [
    {
      key: 'customer',
      header: 'Cliente',
      render: (row) => (
        <div>
          <p>{row.request.customer.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.request.customer.email}
          </p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Solicitud',
      render: (row) => row.request.description,
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (row) => amountFormatter.format(Number(row.amount)),
    },
    {
      key: 'createdAt',
      header: 'Cotizada',
      render: (row) =>
        format(new Date(row.createdAt), 'd MMM yyyy', { locale: es }),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <Badge variant="secondary">{quoteStatusLabel(row.status)}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => {
        const isApproving =
          approveQuote.isPending && approveQuote.variables === row.id;
        const isRejecting =
          rejectQuote.isPending && rejectQuote.variables === row.id;
        const disabled = isApproving || isRejecting;

        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => rejectQuote.mutate(row.id)}
            >
              {isRejecting ? 'Rechazando...' : 'Rechazar'}
            </Button>
            <Button
              size="sm"
              disabled={disabled}
              onClick={() => approveQuote.mutate(row.id)}
            >
              {isApproving ? 'Aprobando...' : 'Aprobar'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={quotes}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="No hay cotizaciones pendientes de aprobación."
    />
  );
}
