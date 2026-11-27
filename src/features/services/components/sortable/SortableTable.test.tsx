// Tests for the drag-and-drop table (decision 038), on its own with no app around it: the grips, the states that are the shared DataTable's,
// a drop through the library's real keyboard sensor (focus the grip, space, arrow, space), a cancel with escape, and the live-region words.
// jsdom has no layout, so each row is given a box of its own by index; the library measures those boxes to know which row the arrow reaches.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataTableColumn } from '@/components/ui';
import { SortableTable, type DragProps } from './SortableTable';

type Row = { id: number; name: string };
const ROWS: Row[] = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Samsung' },
  { id: 3, name: 'Generic' },
  { id: 4, name: 'Xiaomi' },
];
const COLUMNS: DataTableColumn<Row>[] = [{ key: 'name', label: 'Name', render: (row) => row.name }];

const ROW_HEIGHT = 40;
let boxOf: typeof HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
  boxOf = HTMLElement.prototype.getBoundingClientRect;
  // A row sits at its index times its height; anything else (the grip, the table) is a zero box inside it.
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const row = this.closest('tbody > tr');
    const top = row ? Array.from(row.parentElement?.children ?? []).indexOf(row) * ROW_HEIGHT : 0;
    const height = this.tagName === 'TR' ? ROW_HEIGHT : 0;
    return {
      x: 0,
      y: top,
      top,
      bottom: top + height,
      left: 0,
      right: 300,
      width: 300,
      height,
      toJSON: () => ({}),
    };
  };
});
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = boxOf;
});

function drawn(drag: Partial<DragProps<Row>> = {}, rows: Row[] = ROWS) {
  const onDrop = vi.fn();
  render(
    <SortableTable
      skin="list"
      caption="Things"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      drag={{
        offReason: null,
        labelOf: (row) => row.name,
        placeOf: (row) => rows.findIndex((entry) => entry.id === row.id) + 1,
        count: rows.length,
        onDrop,
        ...drag,
      }}
    />,
  );
  return { onDrop };
}

const names = () =>
  within(screen.getByRole('table', { name: 'Things' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent);

describe('the table', () => {
  it('draws a grip first in every row, then the columns', () => {
    drawn();
    expect(names()).toEqual(['Apple', 'Samsung', 'Generic', 'Xiaomi']);
    expect(screen.getByRole('columnheader', { name: 'Drag to reorder' })).toBeInTheDocument();
    for (const row of ROWS) expect(screen.getByRole('button', { name: `Drag ${row.name}` })).toBeEnabled();
  });

  it('draws the shared table, with no grips, when it has no drag prop, no rows or is not ready', () => {
    const { rerender } = render(
      <SortableTable caption="Things" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />,
    );
    expect(screen.queryByRole('button', { name: /^Drag / })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Things' })).toBeInTheDocument();
    rerender(
      <SortableTable
        caption="Things"
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        empty={<p>Nothing here</p>}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    rerender(
      <SortableTable
        caption="Things"
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        state="error"
        errorTitle="Could not load"
        drag={{ offReason: null, labelOf: () => '', placeOf: () => 1, count: 4, onDrop: vi.fn() }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Could not load' })).toBeInTheDocument();
  });

  it('disables every grip, with the reason as its title, when dragging is off', () => {
    drawn({ offReason: 'Clear the search to drag groups' });
    for (const row of ROWS) {
      const grip = screen.getByRole('button', { name: `Drag ${row.name}` });
      expect(grip).toBeDisabled();
      expect(grip).toHaveAttribute('title', 'Clear the search to drag groups');
    }
  });
});

describe('the keyboard', () => {
  it('picks a row up with space, moves it with the arrows and drops it with space', async () => {
    const user = userEvent.setup();
    const { onDrop } = drawn();
    const grip = screen.getByRole('button', { name: 'Drag Apple' });
    await act(async () => grip.focus());
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(1, 3);
  });

  it('moves up as well', async () => {
    const user = userEvent.setup();
    const { onDrop } = drawn();
    await act(async () => screen.getByRole('button', { name: 'Drag Xiaomi' }).focus());
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}');
    await user.keyboard(' ');
    expect(onDrop).toHaveBeenCalledWith(4, 3);
  });

  it('cancels with escape: nothing is reported', async () => {
    const user = userEvent.setup();
    const { onDrop } = drawn();
    await act(async () => screen.getByRole('button', { name: 'Drag Samsung' }).focus());
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('starts nothing from a disabled grip', async () => {
    const user = userEvent.setup();
    const { onDrop } = drawn({ offReason: 'Saving the new order' });
    await user.tab();
    await user.keyboard(' {ArrowDown} ');
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('says what happens in a live region, in English', async () => {
    const user = userEvent.setup();
    drawn();
    await act(async () => screen.getByRole('button', { name: 'Drag Apple' }).focus());
    await user.keyboard(' ');
    expect(await screen.findByText('Picked up Apple, position 1 of 4.')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    expect(await screen.findByText('Apple is over Samsung, position 2 of 4.')).toBeInTheDocument();
    await user.keyboard(' ');
    expect(await screen.findByText('Apple dropped at position 2 of 4.')).toBeInTheDocument();
  });

  it('describes how to use the grip to a screen reader', () => {
    drawn();
    const grip = screen.getByRole('button', { name: 'Drag Apple' });
    const described = document.getElementById(grip.getAttribute('aria-describedby') ?? '');
    expect(described).toHaveTextContent(/press space or enter on its grip/);
    expect(grip).toHaveAttribute('aria-roledescription', 'sortable');
  });
});
