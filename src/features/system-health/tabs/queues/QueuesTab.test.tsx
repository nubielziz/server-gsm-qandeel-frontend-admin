// Tests for what the Queues & jobs tab shows, run through the whole app against the dev mock API: the healthy and the
// degraded story, the read-only staff member, a failing queues read, the Bull Board link, the quiet line that folds
// healthy rows (queues and jobs), the card of the gateway callbacks and the age of the oldest queued job. The actions have their own
// file (QueueActions.test.tsx), the two drawers theirs (Drawers.test.tsx).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import type { JobsResponse, QueuesResponse, QueueStats, ScheduledJob } from '../../types';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const ROUTE = '/system-health?tab=queues';

const queuesTable = () => screen.findByRole('table', { name: 'Queues' }, SLOW);
const jobsTable = () => screen.findByRole('table', { name: 'Scheduled jobs' }, SLOW);
const webhooksTable = () => screen.findByRole('table', { name: 'Webhook delivery' }, SLOW);

/** The table row that holds `text` (a queue or job name). */
const rowOf = (table: HTMLElement, text: string) => {
  const row = within(table).getByText(text).closest('tr');
  if (!row) throw new Error(`No row holds ${text}.`);
  return row;
};

describe('a healthy platform', () => {
  it('folds every queue and job into one quiet line each, with the numbers that matter, and lists the gateway callbacks', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: ROUTE });
    expect(await screen.findByText('All 7 queues healthy', undefined, SLOW)).toBeInTheDocument();
    expect(await screen.findByText('All 5 jobs healthy', undefined, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Queues' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Scheduled jobs' })).not.toBeInTheDocument();
    // The queues strip keeps the one number that matters while the rows are folded, with its unit and the KPI cell's name.
    const queuesCard = screen.getByRole('region', { name: 'Queues' });
    expect(within(queuesCard).getByText(/Oldest queued job/)).toBeInTheDocument();
    // The webhooks card has one row and nothing to fold away, so its numbers are always in view.
    const webhooks = await webhooksTable();
    expect(within(webhooks).getAllByRole('row')).toHaveLength(2);
    expect(within(webhooks).getByText('Payment gateways')).toBeInTheDocument();
    expect(within(webhooks).getByText(/99\.77\s?%/)).toBeInTheDocument();
    // Nothing waits: the server's "nothing" reads plainly, not as 0s.
    expect(within(webhooks).getByText('None waiting')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show 7 healthy queues' }));
    const table = await queuesTable();
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    const row = rowOf(table, 'orders.fetch');
    expect(within(row).getByText('OK')).toBeInTheDocument();
    expect(within(row).getByText('orders.fetch')).toHaveClass('mono');
    // Units are always visible: the rate carries /min and the age its own unit.
    expect(within(row).getByText(/\/min$/)).toBeInTheDocument();
    expect(within(row).getByText(/^\d+s$|^<1s$/)).toBeInTheDocument();
    // A queue with nothing waiting says so, as the webhooks row does.
    expect(within(rowOf(table, 'risk.assess')).getByText('None waiting')).toBeInTheDocument();
  });

  it('hides the rows again with Hide, and the button says so for assistive technology', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: ROUTE });
    const show = await screen.findByRole('button', { name: 'Show 5 healthy jobs' }, SLOW);
    expect(show).toHaveAttribute('aria-expanded', 'false');
    await user.click(show);
    const table = await jobsTable();
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    const hide = screen.getByRole('button', { name: 'Hide 5 healthy jobs' });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    await user.click(hide);
    expect(screen.queryByRole('table', { name: 'Scheduled jobs' })).not.toBeInTheDocument();
  });

  it('shows each job with its cron text in mono and the server words for it, and never reads the cron itself', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: ROUTE });
    await user.click(await screen.findByRole('button', { name: 'Show 5 healthy jobs' }, SLOW));
    const table = await jobsTable();
    const row = rowOf(table, 'price_sync');
    expect(within(row).getByText('*/15 * * * *')).toHaveClass('mono');
    expect(within(row).getByText('Every 15 minutes')).toBeInTheDocument();
    expect(within(row).getByText('Supplier price sync')).toBeInTheDocument();
    expect(within(row).getByText('Succeeded')).toBeInTheDocument();
    expect(within(row).getByText('OK')).toBeInTheDocument();
    // A last run with its age and its duration, and a next run with how far away it is.
    expect(within(row).getByText(/ago · \d+s$|just now · \d+s$/)).toBeInTheDocument();
    expect(within(row).getByText(/^in \d+m$|^in <1m$|^due now$/)).toBeInTheDocument();
  });
});

describe('a platform in trouble', () => {
  it('shows the queue in trouble first, with the server state and its controls, and folds the rest', async () => {
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const table = await queuesTable();
    // Only the queue the server flags is a row; the other six are one quiet line.
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('6 queues healthy')).toBeInTheDocument();
    const row = rowOf(table, 'orders.dispatch');
    const cells = within(row).getAllByRole('cell');
    expect(within(cells[1]).getByText('Warn')).toBeInTheDocument();
    // The age of the oldest job carries the same state as a word for screen readers, and its unit.
    expect(within(cells[6]).getByText('Warn')).toHaveClass('sr-only');
    // A whole number of minutes is written without its seconds (`3m`), so both forms are right.
    expect(cells[6]).toHaveTextContent(/\d+m( \d+s)?/);
    expect(cells[5]).toHaveTextContent('23');
    expect(cells[7]).toHaveTextContent(/\/min$/);
    expect(within(row).getByRole('button', { name: 'Pause orders.dispatch' })).toBeEnabled();
    expect(
      within(row).getByRole('button', { name: 'Retry all failed jobs of orders.dispatch' }),
    ).toBeEnabled();
    expect(within(row).getByRole('button', { name: 'Failed jobs of orders.dispatch' })).toBeEnabled();
  });

  it('shows the job that failed first, with the server state, how the run ended and why', async () => {
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const table = await jobsTable();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    const row = rowOf(table, 'price_sync');
    expect(within(row).getByText('Critical')).toBeInTheDocument();
    expect(within(row).getByText('Failed')).toBeInTheDocument();
    expect(within(row).getByText('Rapid IMEI: timeout after 6000 ms')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Run now price_sync' })).toBeEnabled();
    expect(within(row).getByRole('button', { name: 'History of price_sync' })).toBeEnabled();
  });

  it('marks the numbers of the gateway callbacks with the server state, not with colour alone', async () => {
    await openHealthPage({ scenario: 'outage', route: ROUTE });
    const table = await webhooksTable();
    const rows = within(table).getAllByRole('row');
    // The callbacks fail in an outage, so the success rate is critical.
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('Payment gateways');
    expect(within(rows[1]).getByText('Critical')).toHaveClass('sr-only');
  });

  it('lists the queues in the worst server state first when the database is down', async () => {
    await openHealthPage({ scenario: 'outage', route: ROUTE });
    const table = await queuesTable();
    const rows = within(table).getAllByRole('row').slice(1);
    // Three queues are critical, the rest are folded away.
    const states = rows.map(
      (row) => within(within(row).getAllByRole('cell')[1]).getByText(/^(Critical|Warn)$/).textContent,
    );
    expect(states).toEqual(['Critical', 'Critical', 'Critical']);
    expect(screen.getByText('4 queues healthy')).toBeInTheDocument();
  });
});

describe('the webhooks card', () => {
  it('shows the one row of the gateway callbacks even when they are fine, with nothing to fold', async () => {
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const table = await webhooksTable();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    const card = screen.getByRole('region', { name: 'Webhooks' });
    expect(card).toHaveTextContent(/\d+\.\d+\s?%/);
    expect(within(card).queryByText(/healthy/)).not.toBeInTheDocument();
  });

  it('reads an older backend that still sends the retired part for webhooks to merchants, and does not show it', async () => {
    const measureOf = (value: number | null, unit: string, state: string) => ({ value, unit, state });
    const incoming = {
      successRate: measureOf(99.5, 'percent', 'ok'),
      delivered: 120,
      failed: 1,
      retrying: 0,
      oldestUndeliveredAt: null,
      oldestAge: measureOf(0, 's', 'ok'),
    };
    const outgoing = { ...incoming, successRate: measureOf(61, 'percent', 'crit'), retrying: 40 };
    mockServer.use(http.get('*/admin/system/webhooks', () => HttpResponse.json({ outgoing, incoming })));
    await openHealthPage({ route: ROUTE });
    const table = await webhooksTable();
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Payment gateways')).toBeInTheDocument();
    expect(within(table).getByText(/99\.5/)).toBeInTheDocument();
    expect(within(table).queryByText(/61\s?%/)).not.toBeInTheDocument();
    expect(within(table).queryByText('Critical')).not.toBeInTheDocument();
  });
});

describe('the age of the oldest queued job of a queue', () => {
  const queue = (name: string, over: Partial<QueueStats> = {}): QueueStats => ({
    name,
    state: 'warn',
    paused: false,
    waiting: 0,
    active: 0,
    delayed: 0,
    failed: 12,
    oldestAge: { value: 0, unit: 's', state: 'ok' },
    ratePerMin: { value: 5, unit: 'per_min', state: 'ok' },
    workers: 2,
    ...over,
  });

  it('says "None waiting" only where nothing waits and the server calls the age fine; every other age is printed', async () => {
    mockServer.use(
      http.get('*/admin/system/queues', () =>
        HttpResponse.json<QueuesResponse>({
          queues: [
            queue('idle'),
            queue('busy', { waiting: 4, oldestAge: { value: 12, unit: 's', state: 'ok' } }),
            queue('late', { state: 'crit', oldestAge: { value: 130, unit: 's', state: 'warn' } }),
            queue('blind', { oldestAge: { value: null, unit: 's', state: 'unknown' } }),
          ],
          oldestAge: { value: 130, unit: 's', state: 'warn' },
          trend: [],
        }),
      ),
    );
    await openHealthPage({ route: ROUTE });
    const table = await queuesTable();
    // The sixth cell is the age (queue, state, waiting, active, delayed, failed, oldest queued job…).
    const oldest = (name: string) => within(rowOf(table, name)).getAllByRole('cell')[6];
    expect(oldest('idle')).toHaveTextContent('None waiting');
    expect(oldest('busy')).toHaveTextContent('12s');
    expect(oldest('busy')).not.toHaveTextContent('None waiting');
    // A worse state is never hidden behind the sentence, even when the count says nothing waits.
    expect(oldest('late')).toHaveTextContent('2m 10s');
    expect(within(oldest('late')).getByText('Warn')).toHaveClass('sr-only');
    expect(oldest('blind')).toHaveTextContent('No data');
    expect(oldest('blind')).not.toHaveTextContent('None waiting');
  });
});

describe('who may do what', () => {
  it('draws no control that changes anything for a staff member who can only read', async () => {
    await openHealthPage({ scenario: 'degraded', permissions: ['system:read'], route: ROUTE });
    const queues = await queuesTable();
    const queueRow = rowOf(queues, 'orders.dispatch');
    expect(within(queueRow).queryByRole('button', { name: /^Pause/ })).not.toBeInTheDocument();
    expect(within(queueRow).queryByRole('button', { name: /^Retry all failed/ })).not.toBeInTheDocument();
    // Looking is not changing: the lists stay available.
    expect(within(queueRow).getByRole('button', { name: 'Failed jobs of orders.dispatch' })).toBeEnabled();
    const jobRow = rowOf(await jobsTable(), 'price_sync');
    expect(within(jobRow).queryByRole('button', { name: /^Run now/ })).not.toBeInTheDocument();
    expect(within(jobRow).getByRole('button', { name: 'History of price_sync' })).toBeEnabled();
  });

  it('draws no control that changes anything in the read-only scenario either', async () => {
    await openHealthPage({ scenario: 'readonly', route: ROUTE });
    const queueRow = rowOf(await queuesTable(), 'orders.dispatch');
    expect(within(queueRow).queryByRole('button', { name: /^Pause/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Run now/ })).not.toBeInTheDocument();
    expect(within(queueRow).getByRole('button', { name: 'Failed jobs of orders.dispatch' })).toBeEnabled();
  });

  it('disables the controls with the missing permission as their title for a role that can change something else', async () => {
    await openHealthPage({
      scenario: 'degraded',
      permissions: ['system:read', 'alerts:read', 'alerts:update'],
      route: ROUTE,
    });
    const queueRow = rowOf(await queuesTable(), 'orders.dispatch');
    const pause = within(queueRow).getByRole('button', { name: 'Pause orders.dispatch' });
    expect(pause).toBeDisabled();
    expect(pause).toHaveAttribute('title', 'You need the system:manage permission');
    expect(
      within(queueRow).getByRole('button', { name: 'Retry all failed jobs of orders.dispatch' }),
    ).toBeDisabled();
    const run = within(rowOf(await jobsTable(), 'price_sync')).getByRole('button', {
      name: 'Run now price_sync',
    });
    expect(run).toBeDisabled();
  });
});

describe('a job that is running', () => {
  it('reads the jobs again by itself, long before the slow poll, until the run has ended', async () => {
    let reads = 0;
    const job = (running: boolean): ScheduledJob => ({
      name: 'price_sync',
      label: 'Supplier price sync',
      schedule: '*/15 * * * *',
      scheduleText: 'Every 15 minutes',
      state: 'warn',
      running,
      lastRun: null,
      nextRunAt: null,
    });
    // The first answer says the job is working; every later one says it has finished.
    mockServer.use(
      http.get('*/admin/system/jobs', () => {
        reads += 1;
        return HttpResponse.json<JobsResponse>({ jobs: [job(reads === 1)], runs: [] });
      }),
    );
    await openHealthPage({ route: ROUTE });
    const row = rowOf(await jobsTable(), 'price_sync');
    expect(within(row).getByText('Running')).toBeInTheDocument();
    // While it runs, Run now is off: a second start would be refused.
    expect(within(row).getByRole('button', { name: 'Run now price_sync' })).toBeDisabled();
    // The card asks again after five seconds, where its own poll waits thirty.
    await waitFor(() => expect(within(row).queryByText('Running')).not.toBeInTheDocument(), {
      timeout: 12_000,
    });
    expect(reads).toBeGreaterThan(1);
    expect(within(row).getByRole('button', { name: 'Run now price_sync' })).toBeEnabled();
  });
});

describe('when one read fails', () => {
  it('shows the queues card as an error with Retry while the jobs and the webhooks still render', async () => {
    await openHealthPage({ scenario: 'partial-failure', route: ROUTE });
    // The queues read answers 500; the client reads once more before it gives up.
    expect(
      await screen.findByText('Could not load the queues', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    const queuesCard = screen.getByRole('region', { name: 'Queues' });
    expect(within(queuesCard).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(await screen.findByText('All 5 jobs healthy', undefined, SLOW)).toBeInTheDocument();
    expect(await webhooksTable()).toBeInTheDocument();
  });
});

describe('Bull Board', () => {
  it('shows no link while its address is not set', async () => {
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    await queuesTable();
    expect(screen.queryByRole('link', { name: /Bull Board/ })).not.toBeInTheDocument();
  });

  it('links each queue to its page in Bull Board, in a new tab, when the address is set', async () => {
    vi.stubEnv('VITE_BULL_BOARD_URL', 'https://bull.example.com/admin/queues/');
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    const link = within(row).getByRole('link', { name: /Bull Board for orders\.dispatch/ });
    expect(link).toHaveAttribute('href', 'https://bull.example.com/admin/queues/queue/orders.dispatch');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
