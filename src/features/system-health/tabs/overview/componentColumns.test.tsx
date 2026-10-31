// Tests for the columns of the Overview tab's components list: which one gives way on a narrow screen, and the status
// that is drawn once (in its own column, or in the heading of a phone card).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HealthComponent } from '../../types';
import { componentColumns, type ColumnContext } from './componentColumns';

const measure = { value: 40, unit: 'ms' as const, state: 'ok' as const };

const down: HealthComponent = {
  key: 'postgres',
  name: 'Postgres',
  kind: 'core',
  status: 'down',
  since: '2026-10-31T10:16:00.000Z',
  latency: measure,
  uptime: { h24: measure, d7: measure, d30: measure },
  lastCheckedAt: null,
  detail: null,
  supplierId: null,
  gatewayId: null,
};

const context: ColumnContext = {
  now: Date.parse('2026-10-31T10:30:00.000Z'),
  historyLabel: 'Last 24 hours',
  history: { status: 'loading', buckets: new Map(), placeholder: false },
  picked: null,
  onPick: () => undefined,
  canOpenSupplier: false,
  compact: false,
};

const byKey = (compact: boolean) =>
  Object.fromEntries(componentColumns({ ...context, compact }).map((column) => [column.key, column]));

describe('componentColumns', () => {
  it('never hides "since", because what is broken and since when is what the list is for', () => {
    expect(byKey(false).since?.hide).toBeUndefined();
  });

  it('lets the three uptime figures give way below xl, and keeps the status, name, latency and bars at every width', () => {
    const columns = byKey(false);
    for (const key of ['uptime24', 'uptime7', 'uptime30']) expect(columns[key]?.hide).toBe('xl');
    for (const key of ['status', 'component', 'since', 'latency', 'history']) {
      expect(columns[key]?.hide).toBeUndefined();
    }
  });

  it('labels the bars with the range in words', () => {
    expect(byKey(false).history?.label).toBe('Last 24 hours');
  });

  it('draws the status in its own column in a table, and leaves that card line out on a phone', () => {
    const table = byKey(false).status!.render(down);
    render(<>{table}</>);
    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(byKey(true).status!.render(down)).toBeNull();
  });
});
