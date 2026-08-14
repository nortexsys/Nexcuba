import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

interface Row {
  id: string;
  name: string;
  sector: string;
}

const rows: Row[] = [
  { id: 'a', name: 'Cafetaleros S.R.L.', sector: 'Alimentación' },
  { id: 'b', name: 'SoftCuba', sector: 'Tecnología' },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Empresa' },
  { key: 'sector', header: 'Sector' },
];

describe('DataTable (dual list view, D-5)', () => {
  it('renders an accessible labelled table with header cells', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        ariaLabel="Empresas"
        emptyLabel="Sin resultados"
      />,
    );
    const table = screen.getByRole('table', { name: 'Empresas' });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Empresa' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Sector' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'SoftCuba' })).toBeInTheDocument();
  });

  it('links the first column when getRowHref is provided', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        getRowHref={(row) => `/empresas/${row.id}`}
        ariaLabel="Empresas"
        emptyLabel="Sin resultados"
      />,
    );
    const link = screen.getByRole('link', { name: 'Cafetaleros S.R.L.' });
    expect(link).toHaveAttribute('href', '/empresas/a');
    // Sector cells stay plain
    expect(screen.getByRole('cell', { name: 'Alimentación' }).querySelector('a')).toBeNull();
  });

  it('renders the empty state when there are no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        ariaLabel="Empresas"
        emptyLabel="Sin resultados"
      />,
    );
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('applies per-column className to header cells', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', header: 'Empresa', className: 'w-1/2' },
          { key: 'sector', header: 'Sector' },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        ariaLabel="Empresas"
        emptyLabel="Sin resultados"
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Empresa' }).className).toContain('w-1/2');
  });

  it('uses custom renderers when provided', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', header: 'Empresa' },
          { key: 'sector', header: 'Sector', render: (row) => <em>{row.sector}</em> },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        ariaLabel="Empresas"
        emptyLabel="Sin resultados"
      />,
    );
    expect(screen.getByText('Tecnología').tagName).toBe('EM');
  });
});
