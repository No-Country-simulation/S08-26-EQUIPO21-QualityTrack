import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
} from '@/components/ui';

import type { RequestSummary } from '../types';

export interface RequestsTableProps {
  readonly requests: RequestSummary[];
  readonly isLoading: boolean;
  readonly onCreateQuote: (request: RequestSummary) => void;
}

export function RequestsTable({
  requests,
  isLoading,
  onCreateQuote,
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
      key: 'description',
      header: 'Pieza',
      render: (row) => row.description,
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
      render: () => <Badge variant="outline">Pendiente</Badge>,
    },
    {
      key: 'actions',
      header: 'Acción',
      className: 'text-right',
      render: (row) => (
        <Button onClick={() => onCreateQuote(row)}>Crear cotización</Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={requests}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="No hay solicitudes pendientes de cotizar."
    />
  );
}
