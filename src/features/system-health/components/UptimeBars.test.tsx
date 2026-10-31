// Tests for UptimeBars: cell colours, the accessible name with counts, arrow-key and pointer readouts, and the table view.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CheckBucket, CheckStatus } from '../types';
import { UptimeBars } from './UptimeBars';

// Local time parts keep the clock text the same in every time zone.
function bucket(minute: number, status: CheckStatus, over: Partial<CheckBucket> = {}): CheckBucket {
  return {
    start: new Date(2026, 2, 5, 14, minute).toISOString(),
    status,
    checks: 15,
    failures: 0,
    latencyMs: 412,
    ...over,
  };
}

const BUCKETS: CheckBucket[] = [
  bucket(0, 'ok'),
  bucket(15, 'ok'),
  bucket(30, 'degraded', { failures: 2, latencyMs: 1800 }),
  bucket(45, 'down', { failures: 15, latencyMs: null }),
  bucket(59, 'unknown', { checks: 0, latencyMs: null }),
];

const NAME = 'Postgres checks, last hour: 2 ok, 1 degraded, 1 down, 1 with no data';

function bars() {
  return screen.getByRole('img', { name: NAME });
}

function renderBars(props: Partial<Parameters<typeof UptimeBars>[0]> = {}) {
  return render(
    <UptimeBars buckets={BUCKETS} bucketSeconds={900} label="Postgres checks, last hour" {...props} />,
  );
}

describe('UptimeBars cells', () => {
  it('draws one cell per bucket, coloured by status, with no data as an outline', () => {
    renderBars();
    const cells = Array.from(bars().children);
    expect(cells).toHaveLength(5);
    expect(cells[0]).toHaveClass('bg-good-dot');
    expect(cells[2]).toHaveClass('bg-warn-dot');
    expect(cells[3]).toHaveClass('bg-crit-dot');
    expect(cells[4]).toHaveClass('ring-1', 'ring-line2', 'bg-transparent');
    expect(cells[4]).not.toHaveClass('bg-good-dot');
  });

  it('names the bars with the counts, so colour is not the only carrier, and makes them focusable', () => {
    renderBars();
    expect(bars()).toHaveAttribute('aria-label', NAME);
    expect(bars()).toHaveAttribute('tabindex', '0');
  });

  it('counts a single bucket in the name', () => {
    renderBars({ buckets: [bucket(0, 'ok')], label: 'Redis checks' });
    expect(screen.getByRole('img', { name: 'Redis checks: 1 ok' })).toBeInTheDocument();
  });

  it('says "No data" when there are no buckets at all', () => {
    renderBars({ buckets: [] });
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('UptimeBars keyboard', () => {
  it('starts at the newest cell with ArrowLeft and walks back, announcing each cell', async () => {
    const user = userEvent.setup();
    renderBars();
    await user.tab();
    expect(bars()).toHaveFocus();
    // Nothing is read out until a cell is chosen.
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('');

    await user.keyboard('{ArrowLeft}');
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent(/14:59.*No data, No check ran/);

    await user.keyboard('{ArrowLeft}');
    expect(live).toHaveTextContent(/14:45 to 15:00: Down, 15 of 15 checks failed/);

    await user.keyboard('{ArrowLeft}');
    expect(live).toHaveTextContent(/Degraded, 2 of 15 checks failed, p95 1\.8 s/);
  });

  it('starts at the oldest cell with ArrowRight, and Home and End jump to the ends', async () => {
    const user = userEvent.setup();
    renderBars();
    await user.tab();
    await user.keyboard('{ArrowRight}');
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent(/14:00 to 14:15: OK, 0 of 15 checks failed, p95 412 ms/);
    await user.keyboard('{End}');
    expect(live).toHaveTextContent(/No data/);
    await user.keyboard('{Home}');
    expect(live).toHaveTextContent(/14:00 to 14:15: OK/);
  });

  it('stops at the ends instead of wrapping', async () => {
    const user = userEvent.setup();
    renderBars();
    await user.tab();
    await user.keyboard('{End}{ArrowRight}{ArrowRight}');
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/No data/);
  });

  it('shows a tooltip for the chosen cell and hides it on Escape and on blur', async () => {
    const user = userEvent.setup();
    renderBars();
    await user.tab();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    const tip = document.querySelector<HTMLElement>('.tip');
    expect(tip).toBeInTheDocument();
    expect(within(tip!).getByText('Down')).toBeInTheDocument();
    expect(within(tip!).getByText('15 of 15 checks failed')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(document.querySelector('.tip')).not.toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(document.querySelector('.tip')).toBeInTheDocument();
    await user.tab();
    expect(document.querySelector('.tip')).not.toBeInTheDocument();
  });

  it('dims the other cells while one is chosen', async () => {
    const user = userEvent.setup();
    renderBars();
    await user.tab();
    await user.keyboard('{Home}');
    const cells = Array.from(bars().children);
    expect(cells[0]).not.toHaveClass('opacity-45');
    expect(cells[1]).toHaveClass('opacity-45');
  });
});

describe('UptimeBars pointer', () => {
  it('shows the tooltip of the cell under the pointer and hides it when the pointer leaves', async () => {
    const user = userEvent.setup();
    renderBars();
    await user.hover(bars().children[3]);
    const tip = document.querySelector<HTMLElement>('.tip');
    expect(within(tip!).getByText('Down')).toBeInTheDocument();
    await user.unhover(bars().children[3]);
    expect(document.querySelector('.tip')).not.toBeInTheDocument();
  });

  it('puts the tooltip in a portal, so a table cell cannot clip it', async () => {
    const user = userEvent.setup();
    const { container } = renderBars();
    await user.hover(bars().children[0]);
    expect(container.querySelector('.tip')).not.toBeInTheDocument();
    expect(document.body.querySelector(':scope > .tip')).toBeInTheDocument();
  });
});

describe('UptimeBars table view', () => {
  it('has no table toggle unless asked for', () => {
    renderBars();
    expect(screen.queryByRole('button', { name: 'Table view' })).not.toBeInTheDocument();
  });

  it('swaps the bars for a table of the same buckets, newest first, and back', async () => {
    const user = userEvent.setup();
    renderBars({ withTable: true });
    const toggle = screen.getByRole('button', { name: 'Table view' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('img', { name: NAME })).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: NAME });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    // Newest first: the bucket with no data, then down, degraded, ok, ok.
    expect(within(rows[0]).getByText('No data', { selector: '.badge span' })).toBeInTheDocument();
    expect(within(rows[1]).getByText('Down')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Degraded')).toBeInTheDocument();
    expect(within(rows[2]).getByText('1.8 s')).toBeInTheDocument();
    expect(within(rows[4]).getByText('OK')).toBeInTheDocument();
    // A bucket with no check has a dash for failures, not a reassuring 0.
    expect(within(rows[0]).getAllByRole('cell')[3]).toHaveTextContent('–');

    await user.click(toggle);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(bars()).toBeInTheDocument();
  });
});
