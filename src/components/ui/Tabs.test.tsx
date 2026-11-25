// Tests for Tabs: roles, counts, roving tabindex and arrow-key navigation that moves the selection, and the line that slides under the selected tab.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Box } from '@/lib/motion/slidingIndicator';
import { FakeResizeObserver, installLayout } from '@/lib/motion/testing/layout';
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

describe('Tabs sliding line', () => {
  let undo = () => {};
  afterEach(() => {
    undo();
    vi.unstubAllGlobals();
  });

  it('has one line element before the tabs, hidden from assistive technology, and each tab keeps its own look until it is placed', () => {
    render(<Harness />);
    const list = screen.getByRole('tablist', { name: 'Order status' });
    const mark = list.firstElementChild;
    expect(mark).toHaveAttribute('data-slide-mark');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveClass('slide-mark', 'tabs-mark');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    // jsdom has no layout, so the line is never placed and the CSS keeps drawing the selected tab's own underline.
    expect(list).not.toHaveAttribute('data-indicator');
  });

  it('is placed on the selected tab and moves to the tab that is clicked', async () => {
    FakeResizeObserver.install();
    const user = userEvent.setup();
    render(<Harness />);
    const list = screen.getByRole('tablist', { name: 'Order status' });
    const mark = list.firstElementChild as HTMLElement;
    const [open, review, done] = screen.getAllByRole('tab');
    const boxes = new Map<Element, Box>([
      [open, { x: 0, y: 0, w: 70, h: 36 }],
      [review, { x: 74, y: 0, w: 110, h: 36 }],
      [done, { x: 188, y: 0, w: 50, h: 36 }],
    ]);
    undo = installLayout(list, boxes);
    FakeResizeObserver.fire();
    expect(list).toHaveAttribute('data-indicator');
    expect(mark.style.width).toBe('70px');

    await user.click(review);
    await waitFor(() => expect(mark.style.width).toBe('110px'));
    expect(screen.getByRole('tab', { name: /Needs review/ })).toHaveAttribute('aria-selected', 'true');
  });
});
