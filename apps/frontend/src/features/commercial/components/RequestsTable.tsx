import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
} from '@/components/ui';

import {
  quoteStatusLabel,
  type QuoteSummary,
  type RequestSummary,
} from '../types';

export interface RequestsTableProps {
  readonly requests: RequestSummary[];
  readonly isLoading: boolean;
  /** Cotización asociada a cada solicitud, indexada por `requestId` -- una solicitud sin entrada acá todavía no tiene cotización. */
  readonly quotesByRequestId: ReadonlyMap<string, QuoteSummary>;
  readonly onCreateQuote: (request: RequestSummary) => void;
  readonly onViewQuote: (quote: QuoteSummary) => void;
}

export function RequestsTable({
  requests,
  isLoading,
  quotesByRequestId,
  onCreateQuote,
  onViewQuote,
}: RequestsTableProps) {
  const columns: DataTableColumn<RequestSummary>[] = [
    {
      key: 'id',
      header: 'ID Solicitud',
      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (row) => row.customer.name,
    },
    {
      key: 'piece',
      header: 'Pieza',
      render: (row) => row.piece,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (row) => row.quantity,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (row) =>
        format(new Date(row.createdAt), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        const quote = quotesByRequestId.get(row.id);
        return quote ? (
          <Badge variant="secondary">{quoteStatusLabel(quote.status)}</Badge>
        ) : (
          <Badge variant="outline">Sin cotizar</Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acción',
      className: 'text-right',
      render: (row) => {
        const quote = quotesByRequestId.get(row.id);
        return quote ? (
          <Button variant="outline" onClick={() => onViewQuote(quote)}>
            Ver detalle
          </Button>
        ) : (
          <Button onClick={() => onCreateQuote(row)}>Crear cotización</Button>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={requests}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="No hay solicitudes."
    />
  );
}
