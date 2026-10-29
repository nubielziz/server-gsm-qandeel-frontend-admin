// Tests for DataTable: sorting, row selection, the built-in states, paging and row clicks.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './dataTableTypes';
import { useRowSelection } from './useRowSelection';

interface Row {
  id: number;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: 1, name: 'Alpha', amount: 10 },
  { id: 2, name: 'Beta', amount: 20 },
  { id: 3, name: 'Gamma', amount: 30 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'name', label: 'Name', sortField: 'name', render: (r) => r.name },
  { key: 'amount', label: 'Amount', sortField: 'amount', num: true, render: (r) => r.amount },
  { key: 'plain', label: 'Plain', hide: 'md', render: () => 'x' },
];

describe('DataTable sorting', () => {
  it('marks the sorted column with aria-sort and the others as none', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ field: 'name', order: 'asc' }}
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /amount/i })).toHaveAttribute('aria-sort', 'none');
    // A column without sortField is not sortable and has no aria-sort.
    expect(screen.getByRole('columnheader', { name: 'Plain' })).not.toHaveAttribute('aria-sort');
  });

  it('reports descending when the sorted column is clicked again, and ascending for a new column', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ field: 'name', order: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /name/i }));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'name', order: 'desc' });
    await user.click(screen.getByRole('button', { name: /amount/i }));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'amount', order: 'asc' });
  });

  it('shows descending after a descending sort', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ field: 'amount', order: 'desc' }}
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByRole('columnheader', { name: /amount/i })).toHaveAttribute('aria-sort', 'descending');
  });
});

describe('DataTable selection', () => {
  function Harness() {
    const selection = useRowSelection<number>();
    return (
      <>
        <p data-testid="count">{selection.selected.size}</p>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} selection={selection} />
      </>
    );
  }

  it('select-all ticks every row on the page and untick clears them', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const all = screen.getByLabelText('Select all rows on this page');
    await user.click(all);
    expect(screen.getByTestId('count')).toHaveTextContent('3');
    expect(screen.getByLabelText('Select row 2')).toBeChecked();
    expect(all).toBeChecked();
    await user.click(all);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('shows the header box as indeterminate while only some rows are selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const all = screen.getByLabelText('Select all rows on this page');
    await user.click(screen.getByLabelText('Select row 1'));
    expect(all).toBePartiallyChecked();
    expect(all).not.toBeChecked();
    // Completing the set turns the dash into a full tick.
    await user.click(screen.getByLabelText('Select row 2'));
    await user.click(screen.getByLabelText('Select row 3'));
    expect(all).toBeChecked();
    expect(all).not.toBePartiallyChecked();
  });

  it('marks selected rows with aria-selected', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByLabelText('Select row 2'));
    const row = screen.getByText('Beta').closest('tr');
    expect(row).toHaveAttribute('aria-selected', 'true');
  });
});

describe('DataTable states', () => {
  it('renders a custom empty block when there are no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={<p>No orders yet. Create one.</p>}
      />,
    );
    expect(screen.getByText('No orders yet. Create one.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('falls back to a generic empty block', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getByRole('heading', { name: 'Nothing to show' })).toBeInTheDocument();
  });

  it('shows the error state with the request id and a working Retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        state="error"
        errorTitle="Could not load orders"
        error={{ detail: 'The server is not answering.', requestId: 'req_42' }}
        onRetry={onRetry}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('Could not load orders')).toBeInTheDocument();
    expect(within(alert).getByText('The server is not answering.')).toBeInTheDocument();
    expect(within(alert).getByText('req_42')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a loading skeleton instead of rows', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} state="loading" />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('DataTable paging', () => {
  it('shows the range, the page count and calls onPageChange', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pagination={{ page: 2, pageSize: 25, total: 340 }}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText('26–50 of 340')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 14')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pagination={{ page: 1, pageSize: 25, total: 60 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pagination={{ page: 3, pageSize: 25, total: 60 }}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('shows a plain row count when everything fits on one page', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        pagination={{ page: 1, pageSize: 25, total: 3 }}
      />,
    );
    expect(screen.getByText('3 rows')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});

describe('DataTable row click', () => {
  const clickable: DataTableColumn<Row>[] = [
    ...columns,
    {
      key: 'act',
      label: '',
      render: (r) => (
        <button type="button" onClick={() => inner(r.id)}>
          Menu {r.id}
        </button>
      ),
    },
  ];
  const inner = vi.fn();

  it('opens the row from a cell but not from a control inside the row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={clickable} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    await user.click(screen.getByText('Beta'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
    onRowClick.mockClear();
    await user.click(screen.getByRole('button', { name: 'Menu 3' }));
    expect(inner).toHaveBeenCalledWith(3);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('names an empty header "Actions" for screen readers and marks the cursor row', () => {
    render(<DataTable columns={clickable} rows={rows} rowKey={(r) => r.id} cursorKey={2} />);
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByText('Beta').closest('tr')).toHaveAttribute('data-cursor', '1');
    expect(screen.getByText('Alpha').closest('tr')).not.toHaveAttribute('data-cursor');
  });
});
