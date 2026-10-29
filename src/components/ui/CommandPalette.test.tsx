// Tests for CommandPalette and its filter: typing, arrow keys, Enter, grouping, empty result, Escape.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './CommandPalette';
import { filterPaletteItems, type PaletteItem } from './paletteFilter';
import './testing/dialogPolyfill';

function makeItems(run: (id: string) => void): PaletteItem[] {
  const item = (id: string, label: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({
    id,
    label,
    run: () => run(id),
    ...extra,
  });
  return [
    item('orders', 'Orders', { group: 'Go to', icon: 'orders' }),
    item('merchants', 'Merchants', { group: 'Go to', icon: 'store' }),
    item('risk', 'Open the risk review queue', { group: 'Actions', keywords: ['fraud', 'held'] }),
    item('o1', 'GSM-1042  Unlock iPhone', { group: 'Orders', hint: 'Nova Mobile' }),
  ];
}

function Harness({ run, onClose = () => {} }: { run: (id: string) => void; onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <CommandPalette
      open={open}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
      items={makeItems(run)}
    />
  );
}

describe('CommandPalette', () => {
  it('opens as a combobox with focus in the search field and group headings', async () => {
    render(<Harness run={() => {}} />);
    const input = await screen.findByRole('combobox');
    expect(input).toHaveFocus();
    expect(screen.getByRole('listbox', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByText('Go to')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
  });

  it('filters while typing, including hints and keywords', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    await user.type(screen.getByRole('combobox'), 'nova');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('GSM-1042');
    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'fraud');
    expect(screen.getByRole('option')).toHaveTextContent('risk review');
  });

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByText('No results for “zzz”.')).toBeInTheDocument();
  });

  it('moves with the arrow keys and runs the highlighted item on Enter, closing first', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    const onClose = vi.fn();
    render(<Harness run={run} onClose={onClose} />);
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(screen.getAllByRole('option')[3]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}{ArrowUp}');
    await user.keyboard('{Enter}');
    expect(run).toHaveBeenCalledWith('merchants');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('runs an item on click', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    render(<Harness run={run} />);
    await user.click(screen.getByRole('option', { name: /risk review/ }));
    expect(run).toHaveBeenCalledWith('risk');
  });

  it('closes on Escape without running anything', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    const onClose = vi.fn();
    render(<Harness run={run} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('filterPaletteItems', () => {
  const items = makeItems(() => {});

  it('returns everything for an empty query, capped at the limit', () => {
    expect(filterPaletteItems(items, '')).toHaveLength(4);
    expect(filterPaletteItems(items, '  ', 2)).toHaveLength(2);
  });

  it('needs every word, in any order and case', () => {
    expect(filterPaletteItems(items, 'REVIEW risk').map((i) => i.id)).toEqual(['risk']);
    expect(filterPaletteItems(items, 'review zzz')).toEqual([]);
  });
});
