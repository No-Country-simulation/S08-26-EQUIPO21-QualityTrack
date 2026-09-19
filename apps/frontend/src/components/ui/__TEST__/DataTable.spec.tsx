import { render, screen } from '@testing-library/react';

import { DataTable, type DataTableColumn } from '../DataTable';

interface Row {
  id: string;
  client: string;
  status: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'client', header: 'Cliente', render: (row) => row.client },
  { key: 'status', header: 'Estado', render: (row) => row.status },
];

const rows: Row[] = [
  { id: 'wo-1', client: 'ACME', status: 'routed' },
  { id: 'wo-2', client: 'Globex', status: 'created' },
];

describe('DataTable', () => {
  it('renders headers and one row per item', () => {
    render(
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />,
    );

    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('ACME')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('renders skeleton placeholders while loading, not the rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        isLoading
      />,
    );

    expect(screen.queryByText('ACME')).not.toBeInTheDocument();
  });

  it('renders an empty state when there are no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyMessage="Sin solicitudes"
      />,
    );

    expect(screen.getByText('Sin solicitudes')).toBeInTheDocument();
  });
});
