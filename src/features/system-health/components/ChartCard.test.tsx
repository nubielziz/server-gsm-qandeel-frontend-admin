// Tests for ChartCard: the line with the server's threshold on the right side, null gaps, and the table view.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Measure, SeriesPoint } from '../types';
import { ChartCard } from './ChartCard';

// jsdom has no layout: give the chart box a width, like the kit's own chart tests do.
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 });
});
afterAll(() => {
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

// Local time parts keep the clock text the same in every time zone.
const at = (hour: number) => new Date(2026, 2, 5, hour, 0).toISOString();
const POINTS: SeriesPoint[] = [
  { at: at(10), value: 300 },
  { at: at(11), value: 650 },
  { at: at(12), value: null },
  { at: at(13), value: 1800 },
];
const LATENCY: Pick<Measure, 'unit' | 'warn' | 'crit' | 'direction'> = {
  unit: 'ms',
  warn: 800,
  crit: 1500,
  direction: 'above',
};

function renderChart(over: Partial<Parameters<typeof ChartCard>[0]> = {}) {
  return render(
    <ChartCard
      points={POINTS}
      measure={LATENCY}
      range="24h"
      label="API p95 latency, last 24 hours"
      {...over}
    />,
  );
}

describe('ChartCard chart', () => {
  it('draws the line with its accessible name and names the unit above it', () => {
    const { container } = renderChart();
    expect(screen.getByRole('img', { name: 'API p95 latency, last 24 hours' })).toBeInTheDocument();
    // The line passes a second, so the axis reads in seconds like the "crit 1.5 s" label.
    expect(screen.getByText('Seconds')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveTextContent('10:00');
  });

  it('reads in milliseconds while the axis stays under a second', () => {
    renderChart({
      points: POINTS.map((point) => ({ ...point, value: point.value === null ? null : point.value / 3 })),
      measure: { unit: 'ms' },
    });
    expect(screen.getByText('Milliseconds')).toBeInTheDocument();
  });

  it('names a far-away threshold above the chart instead of stretching the axis to it', () => {
    const { container } = renderChart({
      points: POINTS.map((point) => ({ ...point, value: point.value === null ? null : 120 })),
    });
    expect(screen.getByText('crit 1.5 s, above the chart')).toBeInTheDocument();
    expect(container.querySelector('line[stroke-dasharray="4 3"]')).not.toBeInTheDocument();
  });

  it('draws the server threshold: the crit value, labelled, with the stretch past it in the critical colour', () => {
    const { container } = renderChart();
    expect(container.querySelector('svg')).toHaveTextContent('crit 1.5 s');
    expect(container.querySelector('line[stroke-dasharray="4 3"]')).toBeInTheDocument();
    expect(container.querySelector('path[stroke="rgb(var(--crit-dot))"]')).toBeInTheDocument();
    // Bad above: the critical stretch is the part of the plot above the line (the clip starts at the top).
    expect(container.querySelector('clipPath rect')).toHaveAttribute('y', '0');
  });

  it('falls back to the warn threshold when there is no crit', () => {
    const { container } = renderChart({ measure: { ...LATENCY, crit: null } });
    expect(container.querySelector('svg')).toHaveTextContent('warn 800 ms');
  });

  it('draws the critical stretch below the line for a measure that is bad below, like uptime', () => {
    const uptime: Pick<Measure, 'unit' | 'warn' | 'crit' | 'direction'> = {
      unit: 'percent',
      warn: 99.9,
      crit: 99.5,
      direction: 'below',
    };
    const points: SeriesPoint[] = [
      { at: at(10), value: 100 },
      { at: at(11), value: 99.2 },
    ];
    const { container } = renderChart({ measure: uptime, points, yMin: 98, yMax: 100 });
    expect(container.querySelector('svg')).toHaveTextContent('crit 99.5 %');
    expect(Number(container.querySelector('clipPath rect')?.getAttribute('y'))).toBeGreaterThan(0);
  });

  it('draws no threshold when the measure has none', () => {
    const { container } = renderChart({ measure: { unit: 'ms' } });
    expect(container.querySelector('line[stroke-dasharray="4 3"]')).not.toBeInTheDocument();
    expect(container.querySelector('clipPath')).not.toBeInTheDocument();
  });

  it('keeps a gap as a gap: the tooltip says No data', async () => {
    const user = userEvent.setup();
    const { container } = renderChart();
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(container.querySelector('.tip')).toHaveTextContent('No data');
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/12:00: No data/);
  });

  it('writes a value in the tooltip with its unit', async () => {
    const user = userEvent.setup();
    const { container } = renderChart();
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(container.querySelector('.tip')).toHaveTextContent('650 ms');
  });

  it('says No data, and offers no table, when no point has a value', () => {
    renderChart({ points: POINTS.map((point) => ({ ...point, value: null })) });
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Table view' })).not.toBeInTheDocument();
  });

  it('says No data for a series with no points', () => {
    renderChart({ points: [] });
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});

describe('ChartCard table view', () => {
  it('swaps the chart for a real table of the points, newest first, with units and gaps', async () => {
    const user = userEvent.setup();
    renderChart({ valueLabel: 'p95 latency' });
    const toggle = screen.getByRole('button', { name: 'Table view' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'API p95 latency, last 24 hours' });
    expect(within(table).getByRole('columnheader', { name: 'p95 latency' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    const values = rows.map((row) => within(row).getAllByRole('cell')[1].textContent);
    expect(values).toEqual(['1.8 s', 'No data', '650 ms', '300 ms']);
    expect(within(rows[0]).getAllByRole('cell')[0]).toHaveTextContent(/13:00/);

    await user.click(toggle);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'API p95 latency, last 24 hours' })).toBeInTheDocument();
  });
});
