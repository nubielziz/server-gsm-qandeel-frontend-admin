// Tests for ResponsiveTable: the DataTable by default, stacked cards on a phone (forced by a prop or by the screen width).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataTableColumn } from '@/components/ui';
import { ResponsiveTable, type ResponsiveTableProps } from './ResponsiveTable';

interface Supplier {
  id: number;
  name: string;
  latency: string;
  timeouts: string;
}

const ROWS: Supplier[] = [
  { id: 1, name: 'Dhru Prime', latency: '6.2 s', timeouts: '23 %' },
  { id: 2, name: 'Gsm Direct', latency: '412 ms', timeouts: '0 %' },
];

const COLUMNS: DataTableColumn<Supplier>[] = [
  { key: 'name', label: 'Supplier', render: (row) => row.name },
  { key: 'latency', label: 'Latency', num: true, render: (row) => row.latency },
  { key: 'timeouts', label: 'Timeouts', num: true, hide: 'md', render: (row) => row.timeouts },
  {
    key: 'actions',
    label: '',
    render: (row) => <button type="button">Pause {row.name}</button>,
  },
];

function renderTable(props: Partial<ResponsiveTableProps<Supplier, number>> = {}) {
  return render(
    <ResponsiveTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} caption="Suppliers" {...props} />,
  );
}

// A stand-in for matchMedia that answers the phone query with `narrow`.
function stubScreen(narrow: boolean) {
  return vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: narrow,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('ResponsiveTable as a table', () => {
  it('is the DataTable on a wide screen, which is also what jsdom answers by default', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Suppliers' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('stays a table when a wide screen is asked for explicitly', () => {
    stubScreen(true);
    renderTable({ layout: 'table' });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('passes the DataTable states through', () => {
    renderTable({ rows: [], empty: <p>No suppliers yet</p> });
    expect(screen.getByText('No suppliers yet')).toBeInTheDocument();
  });
});

describe('ResponsiveTable as cards', () => {
  it('shows the same rows as cards when the prop says so', () => {
    renderTable({ layout: 'cards' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = within(screen.getByRole('list', { name: 'Suppliers' })).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
  });

  it('shows the first labelled column as the heading, the others as label: value, actions at the foot', () => {
    renderTable({ layout: 'cards' });
    const [first] = screen.getAllByRole('listitem');
    // Heading without a label.
    expect(within(first).getByText('Dhru Prime')).toHaveClass('font-medium');
    expect(within(first).queryByText('Supplier')).not.toBeInTheDocument();
    // Label: value lines, including the column the table hides on small screens.
    expect(within(first).getByText('Latency').closest('div')).toHaveTextContent('Latency6.2 s');
    expect(within(first).getByText('Timeouts').closest('div')).toHaveTextContent('Timeouts23 %');
    // Actions: the column with an empty label, after a hairline, as the last thing in the card.
    const action = within(first).getByRole('button', { name: 'Pause Dhru Prime' });
    expect(action.parentElement).toHaveClass('border-t');
    expect(first.lastElementChild).toBe(action.parentElement);
  });

  it('follows the screen: cards on a phone, the table on a wide screen', () => {
    stubScreen(true);
    const { unmount } = renderTable();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    unmount();

    stubScreen(false);
    renderTable();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('leaves out the line of a cell that renders nothing for this row', () => {
    const columns: DataTableColumn<Supplier>[] = [
      ...COLUMNS.slice(0, 2),
      {
        key: 'failure',
        label: 'Last failure',
        render: (row) => (row.id === 1 ? 'timeout after 6000 ms' : null),
      },
    ];
    renderTable({ layout: 'cards', columns });
    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first).getByText('Last failure')).toBeInTheDocument();
    expect(within(second).queryByText('Last failure')).not.toBeInTheDocument();
  });

  it('keeps no bare hairline when every action of a card renders nothing', () => {
    const columns: DataTableColumn<Supplier>[] = [
      ...COLUMNS.slice(0, 2),
      { key: 'actions', label: '', render: () => null },
    ];
    renderTable({ layout: 'cards', columns });
    const [first] = screen.getAllByRole('listitem');
    // The foot has no content and hides itself (CSS `:empty`).
    expect(first.lastElementChild).toBeEmptyDOMElement();
    expect(first.lastElementChild).toHaveClass('empty:hidden');
  });

  it('lets another column be the heading', () => {
    renderTable({ layout: 'cards', cardTitle: 'latency' });
    const [first] = screen.getAllByRole('listitem');
    expect(within(first).getByText('6.2 s')).toHaveClass('font-medium');
    expect(within(first).getByText('Supplier')).toBeInTheDocument();
  });

  it('opens the row on a click in the empty part of a card, not on a click on its button', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderTable({ layout: 'cards', onRowClick });
    await user.click(screen.getByText('Gsm Direct'));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);

    onRowClick.mockClear();
    await user.click(screen.getByRole('button', { name: 'Pause Dhru Prime' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('counts the rows under the cards', () => {
    renderTable({ layout: 'cards' });
    expect(screen.getByText('2 rows')).toBeInTheDocument();
  });

  it('pages the cards with the same pager', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderTable({
      layout: 'cards',
      pagination: { page: 1, pageSize: 2, total: 5 },
      onPageChange,
    });
    expect(screen.getByText('1–2 of 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('still shows the loading, error and empty states of the table', () => {
    const { rerender } = renderTable({ layout: 'cards', state: 'loading' });
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    rerender(
      <ResponsiveTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        layout="cards"
        state="error"
        error={new Error('Boom')}
        errorTitle="Could not load suppliers"
      />,
    );
    expect(screen.getByText('Could not load suppliers')).toBeInTheDocument();
    rerender(
      <ResponsiveTable
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        layout="cards"
        empty={<p>None</p>}
      />,
    );
    expect(screen.getByText('None')).toBeInTheDocument();
  });
});
