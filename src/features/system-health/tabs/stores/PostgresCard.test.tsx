// Tests for the Postgres card, rendered with answers made by hand: the status badge, the connections meter (its tone is the
// server's state), problems first, "No data" for a missing reading, and the card's own states.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import type { DatabaseHealth } from '../../types';
import { PostgresCard } from './PostgresCard';
import { databaseHealth, measure, queryOf } from './storesFixture';

// Renders the card with an answer made by hand and returns its panel.
function card(db: DatabaseHealth) {
  render(<PostgresCard query={queryOf(db)} />);
  return screen.getByRole('region', { name: 'Postgres' });
}

/** The labels of the small facts, in the order they are drawn. */
const labels = (root: HTMLElement) => Array.from(root.querySelectorAll('dt')).map((dt) => dt.textContent);
/** The value drawn under a label ("Locks waiting" -> "2"). */
const valueOf = (root: HTMLElement, label: string) =>
  Array.from(root.querySelectorAll('dt'))
    .find((dt) => dt.textContent === label)
    ?.parentElement?.querySelector('dd')?.textContent;
/** The filled part of the usage bar: its width is the ratio and its class is the tone. */
const fill = (root: HTMLElement) => root.querySelector<HTMLElement>('.meter > i');

describe('a healthy Postgres', () => {
  it('shows the status, the connections out of the maximum and every figure with its unit', () => {
    const root = card(databaseHealth());
    expect(within(root).getByText('OK').closest('.badge')).toHaveClass('b-good');
    expect(within(root).getByText('38 of 100 used')).toBeInTheDocument();
    expect(within(root).getByText('38 %')).toBeInTheDocument();
    expect(labels(root)).toEqual([
      'Pool wait',
      'Waiting clients',
      'Locks waiting',
      'Longest lock wait',
      'Replica lag',
      'Size',
    ]);
    const facts = root.querySelector('dl')?.textContent ?? '';
    expect(facts).toContain('4 ms');
    // Seconds print as a duration, so a lag under one second reads "<1s".
    expect(facts).toContain('<1s');
    expect(facts).toContain('18 GB');
    expect(facts).toContain('+310 MB/day');
    expect(within(root).getByText('None pending')).toBeInTheDocument();
  });

  it('draws the bar to used over the maximum, in neutral grey, with no state badge besides the OK in the header', () => {
    const root = card(databaseHealth());
    expect(fill(root)?.style.width).toBe('38%');
    expect(fill(root)).toHaveClass('bg-neutral-dot');
    expect(root.querySelectorAll('.badge')).toHaveLength(1);
  });
});

describe('the meter takes its tone from the server state, never from the numbers', () => {
  it('stays grey when the server says ok, even at 95 of 100', () => {
    const db = databaseHealth();
    const root = card({ ...db, connections: { ...db.connections, used: 95 } });
    expect(fill(root)?.style.width).toBe('95%');
    expect(fill(root)).toHaveClass('bg-neutral-dot');
  });

  it('turns amber and red on the server warn and critical, even at 10 of 100, and adds a badge with the word', () => {
    const db = databaseHealth();
    const warn = card({
      ...db,
      connections: {
        ...db.connections,
        used: 10,
        usage: measure(10, 'percent', 'warn', { warn: 70, crit: 90 }),
      },
    });
    expect(fill(warn)).toHaveClass('bg-warn-dot');
    expect(within(warn).getByText('Warn', { selector: '.badge span' })).toBeInTheDocument();
  });

  it('shows critical as a red bar and a badge with icon and word', () => {
    const db = databaseHealth();
    const root = card({
      ...db,
      connections: {
        ...db.connections,
        used: 97,
        usage: measure(97, 'percent', 'crit', { warn: 70, crit: 90 }),
      },
    });
    expect(fill(root)).toHaveClass('bg-crit-dot');
    expect(within(root).getByText('Critical').closest('.badge')).toHaveClass('b-crit');
  });
});

describe('problems first', () => {
  it('moves a figure the server marks critical to the front, with a state badge beside the number and the limits under it', () => {
    const db = databaseHealth();
    const root = card({
      ...db,
      connections: { ...db.connections, poolWait: measure(30_000, 'ms', 'crit', { warn: 50, crit: 500 }) },
    });
    const facts = root.querySelector('dl') as HTMLElement;
    expect(labels(facts)?.[0]).toBe('Pool wait');
    expect(within(facts).getByText('30 s')).toBeInTheDocument();
    // The state is one badge (icon, word, tone) on the value line, the same way the usage meter shows it.
    expect(within(facts).getByText('Critical').closest('.badge')).toHaveClass('b-crit');
    // The line under the value only has the limits the server applied (their scale is the shared formatter's choice).
    expect(facts.querySelector('p')).toHaveTextContent(/^warn [\d.,]+ m?s · crit [\d.,]+ m?s$/);
  });

  it('folds the OK measures but never a plain fact, while one measure is off', async () => {
    const user = userEvent.setup();
    const db = databaseHealth();
    const root = card({
      ...db,
      connections: { ...db.connections, poolWait: measure(60, 'ms', 'warn', { warn: 50, crit: 500 }) },
    });
    // Longest lock wait and replica lag are OK and fold; the counts and the size stay.
    expect(labels(root)).toEqual(['Pool wait', 'Waiting clients', 'Locks waiting', 'Size']);
    expect(within(root).getByText(/^2 figures OK/)).toBeInTheDocument();
    await user.click(within(root).getByRole('button', { name: 'Show' }));
    expect(labels(root)).toEqual([
      'Pool wait',
      'Waiting clients',
      'Locks waiting',
      'Longest lock wait',
      'Replica lag',
      'Size',
    ]);
  });

  it('orders critical before warning before no data, and the fine ones after in their written order', () => {
    const db = databaseHealth();
    const root = card({
      ...db,
      connections: { ...db.connections, poolWait: measure(60, 'ms', 'warn', { warn: 50, crit: 500 }) },
      locks: { waiting: 0, longestWait: measure(null, 's', 'unknown', { warn: 5, crit: 30 }) },
      replicaLag: measure(45, 's', 'crit', { warn: 5, crit: 30 }),
    });
    expect(labels(root)).toEqual([
      'Replica lag',
      'Pool wait',
      'Longest lock wait',
      'Waiting clients',
      'Locks waiting',
      'Size',
    ]);
  });
});

describe('Postgres down', () => {
  const down = () =>
    databaseHealth({
      status: 'down',
      connections: {
        used: 100,
        max: 100,
        usage: measure(100, 'percent', 'crit', { warn: 70, crit: 90 }),
        poolWait: measure(30_000, 'ms', 'crit', { warn: 50, crit: 500 }),
        waitingClients: 184,
      },
      locks: { waiting: 0, longestWait: measure(null, 's', 'unknown', { warn: 5, crit: 30 }) },
      replicaLag: measure(null, 's', 'unknown', { warn: 5, crit: 30 }),
      slowQueries: [],
    });

  it('says Down with the server numbers, and draws nothing green', () => {
    const root = card(down());
    expect(within(root).getByText('Down').closest('.badge')).toHaveClass('b-crit');
    expect(root.querySelector('.b-good')).toBeNull();
    expect(within(root).getByText('100 of 100 used')).toBeInTheDocument();
    expect(fill(root)).toHaveClass('bg-crit-dot');
    expect(within(root).getByText('184')).toBeInTheDocument();
    expect(within(root).getByText('30 s')).toBeInTheDocument();
  });

  it('prints No data for the readings that are null, not zero, and not "None pending"', () => {
    const root = card(down());
    // Locks waiting (a zero from a database that is down), longest lock wait, replica lag and the migrations list.
    expect(within(root).getAllByText('No data')).toHaveLength(4);
    expect(within(root).queryByText('None pending')).not.toBeInTheDocument();
    expect(root.textContent).not.toMatch(/\b0s\b/);
  });

  it('puts the readings that are missing right after the critical one, ahead of the fine facts', () => {
    expect(labels(card(down()))).toEqual([
      'Pool wait',
      'Locks waiting',
      'Longest lock wait',
      'Replica lag',
      'Waiting clients',
      'Size',
    ]);
  });
});

describe('locks waiting from a database that cannot be asked', () => {
  const locksOf = (status: DatabaseHealth['status'], waiting: number) =>
    databaseHealth({
      status,
      locks: { waiting, longestWait: measure(null, 's', 'unknown', { warn: 5, crit: 30 }) },
    });

  it.each(['down', 'unknown'] as const)(
    'prints No data, not a zero that reads as real, when the database is %s',
    (status) => {
      expect(valueOf(card(locksOf(status, 0)), 'Locks waiting')).toBe('No data');
    },
  );

  it('prints a count above zero as the server sent it, even from a database that is down', () => {
    expect(valueOf(card(locksOf('down', 3)), 'Locks waiting')).toBe('3');
  });

  it('prints a real zero when the database is up', () => {
    expect(valueOf(card(databaseHealth()), 'Locks waiting')).toBe('0');
  });
});

describe('a usage the server has no reading of', () => {
  it('prints No data, not the counts beside it, and draws no bar', () => {
    const db = databaseHealth();
    const root = card({
      ...db,
      connections: {
        ...db.connections,
        used: 0,
        usage: measure(null, 'percent', 'unknown', { warn: 70, crit: 90 }),
      },
    });
    expect(within(root).getByText('No data')).toBeInTheDocument();
    expect(within(root).queryByText(/of 100 used/)).not.toBeInTheDocument();
    expect(root.querySelector('.meter')).toBeNull();
  });
});

describe('other statuses', () => {
  it.each([
    ['degraded', 'Degraded', 'b-warn'],
    ['unknown', 'Unknown', 'b-neutral'],
  ] as const)('shows %s as %s, and never green', (status, word, tone) => {
    const root = card(databaseHealth({ status }));
    expect(within(root).getByText(word).closest('.badge')).toHaveClass(tone);
    expect(root.querySelector('.b-good')).toBeNull();
  });

  it('prints No data for the migrations, not "None pending", when the status is unknown', () => {
    const unknown = card(databaseHealth({ status: 'unknown' }));
    // The locks count also says No data here (its zero is no answer), so look at the migrations block only.
    const migrations = within(unknown).getByText('Pending migrations').parentElement as HTMLElement;
    expect(within(migrations).getByText('No data')).toBeInTheDocument();
    expect(within(unknown).queryByText('None pending')).not.toBeInTheDocument();
  });
});

describe('the other facts', () => {
  it('says "No replica" when the server sends none', () => {
    const root = card(databaseHealth({ replicaLag: null }));
    expect(within(root).getByText('No replica')).toBeInTheDocument();
  });

  it('lists the pending migrations by name in mono', () => {
    const root = card(
      databaseHealth({ pendingMigrations: ['20261029093000_add_alert_rule_unit', '20261030_x'] }),
    );
    const first = within(root).getByText('20261029093000_add_alert_rule_unit');
    expect(first).toHaveClass('mono');
    expect(within(root).getByText('20261030_x')).toBeInTheDocument();
    expect(within(root).queryByText('None pending')).not.toBeInTheDocument();
  });

  it('says there is no growth data when the growth is not measured, never zero', () => {
    const db = databaseHealth();
    const root = card({ ...db, size: { ...db.size, growthPerDayBytes: null } });
    expect(within(root).getByText('No growth data')).toBeInTheDocument();
  });

  it('prints the waiting clients and the waiting locks as plain numbers with a thousands separator', () => {
    const db = databaseHealth();
    const root = card({
      ...db,
      connections: { ...db.connections, waitingClients: 1240 },
      locks: { ...db.locks, waiting: 2 },
    });
    expect(within(root).getByText('1,240')).toBeInTheDocument();
    expect(within(root).getByText('2')).toBeInTheDocument();
  });
});

describe('the card states', () => {
  it('shows a skeleton while the first answer is on its way, and no figures', () => {
    render(<PostgresCard query={queryOf<DatabaseHealth>(undefined)} />);
    const root = screen.getByRole('region', { name: 'Postgres' });
    expect(within(root).getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(root.querySelector('dl')).toBeNull();
  });

  it('shows what failed with the request id and a Retry that reads again', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    const error = new ApiError({
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      title: 'Database unavailable',
      detail: 'The database is not accepting connections.',
      requestId: 'req_db_1',
    });
    render(<PostgresCard query={queryOf<DatabaseHealth>(undefined, { isError: true, error, refetch })} />);
    const root = screen.getByRole('region', { name: 'Postgres' });
    expect(
      within(root).getByText('Could not load Postgres, slow queries and long transactions'),
    ).toBeInTheDocument();
    expect(within(root).getByText('The database is not accepting connections.')).toBeInTheDocument();
    expect(within(root).getByText('req_db_1')).toBeInTheDocument();
    // No status badge: there is no answer to take one from, and a missing answer is never OK.
    expect(root.querySelector('.b-good')).toBeNull();
    await user.click(within(root).getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('names the permission when the server answers 403', () => {
    const error = new ApiError({ status: 403, code: 'FORBIDDEN', detail: 'Missing permission system:read.' });
    render(<PostgresCard query={queryOf<DatabaseHealth>(undefined, { isError: true, error })} />);
    expect(screen.getByText('You need the system:read permission')).toBeInTheDocument();
  });

  it('keeps the last figures with a Stale badge when a refresh fails', () => {
    const error = new ApiError({ status: 500, title: 'Internal Server Error', detail: 'Read failed.' });
    render(
      <PostgresCard
        query={queryOf(databaseHealth(), { isError: true, error, dataUpdatedAt: Date.now() - 125_000 })}
      />,
    );
    const root = screen.getByRole('region', { name: 'Postgres' });
    expect(within(root).getByText('38 of 100 used')).toBeInTheDocument();
    expect(within(root).getByText(/^Stale · updated 2m ago/)).toBeInTheDocument();
  });
});
