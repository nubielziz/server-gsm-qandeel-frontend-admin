// Tests for Tabs: roles, counts, roving tabindex and arrow-key navigation that moves the selection.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, type TabItem } from './Tabs';

type Tab = 'open' | 'review' | 'done';

const items: TabItem<Tab>[] = [
  { value: 'open', label: 'Open', count: 12 },
  { value: 'review', label: 'Needs review', count: 3 },
  { value: 'done', label: 'Done' },
];

function Harness({ onChange = () => {}, initial = 'open' }: { onChange?: (v: Tab) => void; initial?: Tab }) {
  const [value, setValue] = useState<Tab>(initial);
  return (
    <Tabs
      items={items}
      value={value}
      label="Order status"
      onChange={(v) => {
        onChange(v);
        setValue(v);
      }}
    />
  );
}

describe('Tabs', () => {
  it('renders a tablist with the selected tab and neutral counts', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist', { name: 'Order status' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Needs review/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Open 12' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Done' })).toBeInTheDocument();
  });

  it('makes only the selected tab a tab stop', () => {
    render(<Harness initial="review" />);
    expect(screen.getByRole('tab', { name: /Needs review/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'Done' })).toHaveAttribute('tabindex', '-1');
  });

  it('selects a tab on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Done' }));
    expect(onChange).toHaveBeenCalledWith('done');
    expect(screen.getByRole('tab', { name: 'Done' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves the selection and the focus with ArrowRight and ArrowLeft', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.tab();
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('review');
    expect(screen.getByRole('tab', { name: /Needs review/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /Needs review/ })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('open');
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveFocus();
  });

  it('wraps around at both ends', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Done' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Done' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveFocus();
  });

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness initial="review" />);
    await user.tab();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Done' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.tab();
    await user.keyboard('a{ArrowDown}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
