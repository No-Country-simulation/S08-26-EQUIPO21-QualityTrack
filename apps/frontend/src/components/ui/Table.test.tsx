import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, type Column } from './Table';

interface TestRow {
  id: string;
  client: string;
}

const columns: Column<TestRow>[] = [
  { key: 'id', header: 'ID SOLICITUD' },
  { key: 'client', header: 'CLIENTE' },
];

const data: TestRow[] = [
  { id: 'REQ-2026-0311', client: 'Metalúrgica del Sur' },
];

describe('Table Component', () => {
  it('renders headers and data correctly', () => {
    render(
      <Table
        columns={columns}
        data={data}
        keyExtractor={(row) => row.id}
        caption="Tabla de Solicitudes"
      />
    );

    expect(screen.getByRole('columnheader', { name: 'ID SOLICITUD' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'CLIENTE' })).toBeInTheDocument();
    expect(screen.getByText('REQ-2026-0311')).toBeInTheDocument();
    expect(screen.getByText('Metalúrgica del Sur')).toBeInTheDocument();
  });

  it('renders empty message when data is empty', () => {
    render(
      <Table
        columns={columns}
        data={[]}
        keyExtractor={(row) => row.id}
        emptyMessage="Sin registros"
      />
    );

    expect(screen.getByText('Sin registros')).toBeInTheDocument();
  });
});