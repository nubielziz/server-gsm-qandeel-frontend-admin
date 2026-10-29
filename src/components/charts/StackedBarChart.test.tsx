// Tests for StackedBarChart with its legend and table: bars, hidden series, keyboard tooltip, live region.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ChartLegend } from './ChartLegend';
import type { StackedRow } from './chartSeries';
import { SeriesTable } from './SeriesTable';
import { StackedBarChart } from './StackedBarChart';
import { useSeriesVisibility } from './useSeriesVisibility';

const rows: StackedRow[] = [
  { label: 'Mon', values: { IMEI: 10, Server: 5, Remote: 0, File: 1 } },
  { label: 'Tue', values: { IMEI: 20, Server: 0, Remote: 4, File: 2 } },
  { label: 'Wed', values: { IMEI: 30, Server: 10, Remote: 5, File: 0 } },
];

// jsdom has no layout: give every element a width so the chart draws.
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 480 });
});
afterAll(() => {
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe('StackedBarChart', () => {
  it('draws one bar group per period inside a labelled image', () => {
    render(<StackedBarChart rows={rows} label="Orders per day" />);
    const chart = screen.getByRole('img', { name: 'Orders per day' });
    expect(chart).toHaveAttribute('tabindex', '0');
    expect(chart.querySelectorAll('g.bar')).toHaveLength(3);
    expect(chart.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // Series colours come from CSS variables, so a theme change needs no redraw.
    expect(chart.innerHTML).toContain('rgb(var(--s1))');
  });

  it('leaves hidden series out of the bars', () => {
    render(<StackedBarChart rows={rows} label="Orders per day" hidden={new Set(['Server'])} />);
    const html = screen.getByRole('img').innerHTML;
    expect(html).toContain('rgb(var(--s1))');
    expect(html).not.toContain('rgb(var(--s2))');
  });

  it('steps through the periods with the arrow keys and announces each one', async () => {
    const user = userEvent.setup();
    const { container } = render(<StackedBarChart rows={rows} label="Orders per day" />);
    await user.tab();
    expect(screen.getByRole('img')).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    const tip = container.querySelector('.tip');
    expect(tip).toHaveTextContent('Mon');
    expect(tip).toHaveTextContent('Total16');
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Mon: 16 orders.');

    await user.keyboard('{ArrowRight}');
    expect(container.querySelector('.tip')).toHaveTextContent('Tue');
    // The active bar keeps full colour; the others dim.
    expect(container.querySelectorAll('g.bar.dim')).toHaveLength(2);

    await user.keyboard('{Escape}');
    expect(container.querySelector('.tip')).not.toBeInTheDocument();
  });

  it('starts from the last period when ArrowLeft is the first key', async () => {
    const user = userEvent.setup();
    const { container } = render(<StackedBarChart rows={rows} label="Orders per day" />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(container.querySelector('.tip')).toHaveTextContent('Wed');
  });

  it('draws nothing but keeps its height when there are no rows', () => {
    render(<StackedBarChart rows={[]} label="Orders per day" height={180} />);
    const chart = screen.getByRole('img');
    expect(chart.querySelector('svg')).not.toBeInTheDocument();
    expect(chart).toHaveStyle({ height: '180px' });
  });
});

describe('ChartLegend with useSeriesVisibility', () => {
  function Harness() {
    const { hidden, toggle } = useSeriesVisibility();
    return (
      <>
        <ChartLegend rows={rows} hidden={hidden} onToggle={toggle} />
        <StackedBarChart rows={rows} hidden={hidden} label="Orders per day" />
      </>
    );
  }

  it('shows totals and toggles a series off and on', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const imei = screen.getByRole('button', { name: /IMEI/ });
    expect(imei).toHaveTextContent('60');
    expect(imei).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Server/ }));
    expect(screen.getByRole('button', { name: /Server/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img').innerHTML).not.toContain('rgb(var(--s2))');
    await user.click(screen.getByRole('button', { name: /Server/ }));
    expect(screen.getByRole('img').innerHTML).toContain('rgb(var(--s2))');
  });

  it('never lets the last visible series be switched off', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (const name of [/IMEI/, /Server/, /Remote/, /File/])
      await user.click(screen.getByRole('button', { name }));
    const pressed = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
  });
});

describe('SeriesTable', () => {
  it('lists the numbers newest first with a total per row', () => {
    render(<SeriesTable rows={rows} />);
    expect(screen.getByRole('table', { name: 'Orders by type' })).toBeInTheDocument();
    const body = screen.getAllByRole('row').slice(1);
    expect(body[0]).toHaveTextContent('Wed30105045');
    expect(body[2]).toHaveTextContent('Mon10501' + '16');
  });
});
