// Page tests for the Data stores tab, run through the whole app against the dev mock API: what each scenario shows, the
// read-only view, the copy button, one failing read leaving the other cards alone, and problems first.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import type { MockScenario } from '@/mocks/scenario';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { cacheHealth } from './storesFixture';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const ROUTE = '/system-health?tab=stores';

const open = (scenario?: MockScenario, permissions?: string[]) =>
  openHealthPage({ scenario, permissions, route: ROUTE });

/** A card by its title; it is there at once (as a skeleton) and fills when its read answers. */
const card = (name: string) => screen.findByRole('region', { name }, SLOW);

/** The labels of the small facts of a card, in the order they are drawn. */
const labels = (root: HTMLElement) => Array.from(root.querySelectorAll('dt')).map((dt) => dt.textContent);

/** The value drawn under a label ("Locks waiting" -> "2"). */
const valueOf = (root: HTMLElement, label: string) =>
  Array.from(root.querySelectorAll('dt'))
    .find((dt) => dt.textContent === label)
    ?.parentElement?.querySelector('dd')?.textContent;

const follows = (first: HTMLElement, second: HTMLElement) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('healthy', () => {
  it('shows Postgres and Redis OK, the slow queries, and one quiet line for the long transactions', async () => {
    await open();
    const postgres = await card('Postgres');
    expect(await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW)).toBeInTheDocument();
    expect(within(postgres).getByText('OK').closest('.badge')).toHaveClass('b-good');
    expect(labels(postgres)).toEqual([
      'Pool wait',
      'Waiting clients',
      'Locks waiting',
      'Longest lock wait',
      'Replica lag',
      'Size',
    ]);
    expect(within(postgres).getByText('None pending')).toBeInTheDocument();
    expect(within(postgres).queryByText('No data')).not.toBeInTheDocument();

    const redis = await card('Redis');
    expect(await within(redis).findByText(/^\d+ MB of 2 GB used$/, undefined, SLOW)).toBeInTheDocument();
    expect(within(redis).getByText('OK').closest('.badge')).toHaveClass('b-good');
    expect(labels(redis)).toEqual(['Evictions', 'Hit rate', 'Clients', 'Latency']);

    const slow = await card('Slow queries');
    const rows = (await within(slow).findAllByRole('row', undefined, SLOW)).slice(1);
    expect(rows).toHaveLength(5);
    expect(within(await card('Long transactions')).getByText('No long transactions.')).toBeInTheDocument();

    // Both stores are fine, so Postgres stays first.
    expect(follows(postgres, redis)).toBe(true);
  });

  it('copies the whole text of a slow query', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await open();
    const slow = await card('Slow queries');
    await user.click(
      await within(slow).findByRole('button', { name: 'Copy query -8123450912384712938' }, SLOW),
    );
    expect(writeText).toHaveBeenCalledWith(
      'SELECT o.* FROM orders o WHERE o.status = $1 AND o.sla_due_at < now() ORDER BY o.created_at LIMIT $2',
    );
  });
});

describe('degraded', () => {
  it('shows the slowest statements first and the transaction that has been open for minutes', async () => {
    await open('degraded');
    const slow = await card('Slow queries');
    const rows = (await within(slow).findAllByRole('row', undefined, SLOW)).slice(1);
    expect(within(rows[0]).getByText('-8123450912384712938')).toHaveClass('mono');
    expect(within(rows[0]).getByText('247 ms')).toBeInTheDocument();

    const long = await card('Long transactions');
    const row = within((await within(long).findAllByRole('row', undefined, SLOW))[1]);
    expect(row.getByText('31822')).toHaveClass('mono');
    expect(row.getByText('6m 52s')).toBeInTheDocument();
    expect(row.getByText('Idle in transaction')).toBeInTheDocument();

    const postgres = await card('Postgres');
    await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW);
    expect(valueOf(postgres, 'Locks waiting')).toBe('2');
  });
});

describe('outage', () => {
  it('shows Postgres down with the server numbers, no green, and No data for what could not be read', async () => {
    await open('outage');
    const postgres = await card('Postgres');
    expect(await within(postgres).findByText('Down', undefined, SLOW)).toBeInTheDocument();
    expect(within(postgres).getByText('Down').closest('.badge')).toHaveClass('b-crit');
    expect(postgres.querySelector('.b-good')).toBeNull();
    // Out of connections: the bar is full, red because the server says critical, and the pool wait says it too.
    expect(postgres.querySelector('.meter > i')).toHaveClass('bg-crit-dot');
    expect(within(postgres).getAllByText('Critical', { selector: '.badge span' })).toHaveLength(2);
    expect(valueOf(postgres, 'Waiting clients')).toBe('184');
    // Locks waiting (a zero from a database that is down), longest lock wait, replica lag and the migrations list:
    // nothing was read, so it is No data, never zero, never "none".
    expect(within(postgres).getAllByText('No data')).toHaveLength(4);
    expect(valueOf(postgres, 'Locks waiting')).toBe('No data');
    expect(within(postgres).queryByText('None pending')).not.toBeInTheDocument();
    // The critical reading and the missing ones come before the fine ones.
    expect(labels(postgres)?.slice(0, 4)).toEqual([
      'Pool wait',
      'Locks waiting',
      'Longest lock wait',
      'Replica lag',
    ]);
  });

  it('says the lists could not be read instead of looking like good news', async () => {
    await open('outage');
    const slow = await card('Slow queries');
    expect(
      await within(slow).findByText('Postgres is down, so slow queries cannot be read.', undefined, SLOW),
    ).toBeInTheDocument();
    const long = await card('Long transactions');
    expect(
      within(long).getByText('Postgres is down, so long transactions cannot be read.'),
    ).toBeInTheDocument();
    expect(within(slow).queryByText('No slow queries.')).not.toBeInTheDocument();
  });

  it('keeps Redis up beside it and puts its one warning figure first', async () => {
    await open('outage');
    const redis = await card('Redis');
    expect(await within(redis).findByText(/^\d+ MB of 2 GB used$/, undefined, SLOW)).toBeInTheDocument();
    expect(within(redis).getByText('OK').closest('.badge')).toHaveClass('b-good');
    expect(labels(redis)?.[0]).toBe('Clients');
    expect(redis.querySelector('dl')?.textContent).toContain('warn 400 · crit 900');
    // Postgres is worse, so it stays first.
    expect(follows(await card('Postgres'), redis)).toBe(true);
  });
});

describe('maintenance', () => {
  it('says there is no replica and lists the migration that waits, in mono', async () => {
    await open('maintenance');
    const postgres = await card('Postgres');
    expect(await within(postgres).findByText('No replica', undefined, SLOW)).toBeInTheDocument();
    expect(within(postgres).getByText('20261029093000_add_alert_rule_unit')).toHaveClass('mono');
    expect(within(postgres).queryByText('None pending')).not.toBeInTheDocument();
  });
});

describe('scenarios that break something else', () => {
  it.each(['monitoring-down', 'partial-failure'] as const)(
    'shows the stores as usual while the %s scenario fails other reads',
    async (scenario) => {
      await open(scenario);
      const postgres = await card('Postgres');
      expect(await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW)).toBeInTheDocument();
      expect(within(postgres).getByText('OK')).toBeInTheDocument();
      const redis = await card('Redis');
      expect(await within(redis).findByText(/^\d+ MB of 2 GB used$/, undefined, SLOW)).toBeInTheDocument();
      expect(within(await card('Slow queries')).getAllByRole('row')).toHaveLength(6);
    },
  );
});

describe('a read-only staff member', () => {
  it('sees all four cards and no control that changes anything; only the copy buttons are there', async () => {
    await open('readonly');
    const postgres = await card('Postgres');
    expect(await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW)).toBeInTheDocument();
    const slow = await card('Slow queries');
    await within(slow).findAllByRole('row', undefined, SLOW);
    const panel = screen.getByRole('tabpanel', { name: 'Data stores' });
    const buttons = within(panel).getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toHaveAccessibleName(/^Copy query/);
  });

  it('shows the tab to a staff member who only holds system:read', async () => {
    await open(undefined, ['system:read']);
    const postgres = await card('Postgres');
    expect(await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW)).toBeInTheDocument();
  });
});

describe('one failing read', () => {
  it('shows the error once, in the Postgres card, leaves Redis alone, and the lists return with a good read', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/system/database', () =>
        problem(
          503,
          'DATABASE_UNAVAILABLE',
          'Database unavailable',
          'The database is not accepting connections.',
        ),
      ),
    );
    await open();
    const postgres = await card('Postgres');
    expect(
      await within(postgres).findByText(
        'Could not load Postgres, slow queries and long transactions',
        undefined,
        SLOW,
      ),
    ).toBeInTheDocument();
    expect(within(postgres).getByText('The database is not accepting connections.')).toBeInTheDocument();
    expect(within(postgres).getByText(/^mock-req-/)).toHaveClass('mono');
    // The two lists share this read: they wait for it instead of repeating the error.
    expect(screen.queryByRole('region', { name: 'Slow queries' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Long transactions' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1);
    // No badge says the database is fine.
    expect(postgres.querySelector('.badge')).toBeNull();

    const redis = await card('Redis');
    expect(await within(redis).findByText(/^\d+ MB of 2 GB used$/, undefined, SLOW)).toBeInTheDocument();

    // The database answers again: Retry reads again and everything comes back.
    mockServer.resetHandlers();
    await user.click(within(postgres).getByRole('button', { name: 'Retry' }));
    expect(await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW)).toBeInTheDocument();
    const slow = await card('Slow queries');
    expect(await within(slow).findAllByRole('row', undefined, SLOW)).toHaveLength(6);
    expect(await card('Long transactions')).toBeInTheDocument();
  });

  it('shows the error of the cache in the Redis card alone, and keeps Postgres and its lists', async () => {
    mockServer.use(
      http.get('*/admin/system/cache', () =>
        problem(500, 'INTERNAL_ERROR', 'Something went wrong', 'Redis did not answer.'),
      ),
    );
    await open();
    const redis = await card('Redis');
    expect(await within(redis).findByText('Could not load Redis', undefined, SLOW)).toBeInTheDocument();
    expect(within(redis).getByText('Redis did not answer.')).toBeInTheDocument();
    const postgres = await card('Postgres');
    expect(await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW)).toBeInTheDocument();
    expect(within(await card('Slow queries')).getAllByRole('row')).toHaveLength(6);
    // Redis is the one with a problem, so it comes first.
    await waitFor(() => expect(follows(redis, postgres)).toBe(true), SLOW);
  });
});

describe('problems first', () => {
  it('puts Redis in front of Postgres when the server says Redis is the one with the worse status', async () => {
    mockServer.use(
      http.get('*/admin/system/cache', () =>
        HttpResponse.json(
          cacheHealth({
            status: 'down',
            hitRate: { ...cacheHealth().hitRate, value: null, state: 'unknown' },
          }),
        ),
      ),
    );
    await open();
    const redis = await card('Redis');
    expect(await within(redis).findByText('Down', undefined, SLOW)).toBeInTheDocument();
    const postgres = await card('Postgres');
    await within(postgres).findByText(/^\d+ of 100 used$/, undefined, SLOW);
    await waitFor(() => expect(follows(redis, postgres)).toBe(true), SLOW);
    // The missing reading is No data, and the Down badge is red.
    expect(within(redis).getByText('Down').closest('.badge')).toHaveClass('b-crit');
    expect(within(redis).getByText('No data')).toBeInTheDocument();
  });
});
