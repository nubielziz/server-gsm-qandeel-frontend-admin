// Tests for the controls of the Queues & jobs tab, run through the whole app against the dev mock API: Pause (asks for a
// reason), Resume, Retry all failed and Run now. Each states its effect in a dialog before the button, sends the body
// the contract names, and reports by toast; a refusal of the server shows in the dialog, not in a toast.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { apiPost } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';
import type { JobsResponse } from '../../types';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const ROUTE = '/system-health?tab=queues';
const PAUSE = '/admin/system/queues/orders.dispatch/pause';

// A queue name sits in a mono span inside the title. jsdom's accessible name puts a space after an inline element
// ("orders.dispatch ?"), which a browser does not, so these names allow one.
const PAUSE_TITLE = /^Pause orders\.dispatch ?\?$/;
const RESUME_TITLE = /^Resume orders\.dispatch ?\?$/;
const RETRY_ALL_TITLE = /^Retry all failed jobs of orders\.dispatch ?\?$/;

const queuesTable = () => screen.findByRole('table', { name: 'Queues' }, SLOW);
const jobsTable = () => screen.findByRole('table', { name: 'Scheduled jobs' }, SLOW);

/** The table row that holds `text` (a queue or job name). */
const rowOf = (table: HTMLElement, text: string) => {
  const row = within(table).getByText(text).closest('tr');
  if (!row) throw new Error(`No row holds ${text}.`);
  return row;
};

describe('Pause', () => {
  it('says what a pause does, asks for a reason, and sends { paused: true, reason }', async () => {
    const user = userEvent.setup();
    const seen = recordRequests('post', PAUSE);
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    await user.click(within(row).getByRole('button', { name: 'Pause orders.dispatch' }));

    const dialog = await screen.findByRole('dialog', { name: PAUSE_TITLE });
    expect(dialog).toHaveTextContent(
      'Workers stop taking jobs from orders.dispatch; waiting jobs stay queued.',
    );

    // The reason is required: an empty box is stopped on the form, before any request.
    await user.click(within(dialog).getByRole('button', { name: 'Pause queue' }));
    expect(await within(dialog).findByText('Say why you are pausing this queue.')).toBeInTheDocument();
    expect(seen).toHaveLength(0);

    await user.type(
      within(dialog).getByRole('textbox', { name: 'Reason' }),
      'Supplier outage, holding dispatch',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Pause queue' }));
    await waitFor(() => expect(seen).toHaveLength(1), SLOW);
    expect(seen[0].body).toEqual({ paused: true, reason: 'Supplier outage, holding dispatch' });

    // The result is a toast, the dialog goes, and the table shows the pause after it reads the counters again.
    expect(await screen.findByText('orders.dispatch paused', undefined, SLOW)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SLOW);
    await waitFor(() => {
      const paused = rowOf(screen.getByRole('table', { name: 'Queues' }), 'orders.dispatch');
      expect(within(paused).getByText('Paused')).toBeInTheDocument();
      expect(within(paused).getByRole('button', { name: 'Resume orders.dispatch' })).toBeInTheDocument();
    }, SLOW);
  });

  it("shows the server's message under the reason, and keeps the dialog open, when it refuses the reason", async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    await user.click(within(row).getByRole('button', { name: 'Pause orders.dispatch' }));
    const dialog = await screen.findByRole('dialog', { name: PAUSE_TITLE });
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'ab');
    await user.click(within(dialog).getByRole('button', { name: 'Pause queue' }));
    expect(
      await within(dialog).findByText(
        'Say why you are pausing this queue (at least 3 characters).',
        undefined,
        SLOW,
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Reason' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: PAUSE_TITLE })).toBeInTheDocument();
    // A dialog answers the write, so there is no second, toast copy of the error (its title would be the toast).
    expect(screen.queryByText('Check the form')).not.toBeInTheDocument();
  });

  it("shows a server message about `paused`, which has no box, in the dialog's error slot and keeps the dialog open", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post(`*${PAUSE}`, () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', undefined, [
          { field: 'paused', message: 'Send paused: true to pause the queue or false to resume it.' },
        ]),
      ),
    );
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    await user.click(within(row).getByRole('button', { name: 'Pause orders.dispatch' }));
    const dialog = await screen.findByRole('dialog', { name: PAUSE_TITLE });
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Reason' }),
      'Supplier outage, holding dispatch',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Pause queue' }));

    // No input is called `paused`, so the message is not put on a field nobody sees: it reads in the error slot with its name.
    await waitFor(
      () =>
        expect(within(dialog).getByRole('alert')).toHaveTextContent(
          'paused: Send paused: true to pause the queue or false to resume it.',
        ),
      SLOW,
    );
    expect(screen.getByRole('dialog', { name: PAUSE_TITLE })).toBeInTheDocument();
    // The reason box is not marked for a message that is not about it, and a dialog answers the write: no toast copy.
    expect(within(dialog).getByRole('textbox', { name: 'Reason' })).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.queryByText('Check the form')).not.toBeInTheDocument();
    expect(screen.queryByText('orders.dispatch paused')).not.toBeInTheDocument();
  });

  it('sends nothing when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const seen = recordRequests('post', PAUSE);
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    await user.click(within(row).getByRole('button', { name: 'Pause orders.dispatch' }));
    const dialog = await screen.findByRole('dialog', { name: PAUSE_TITLE });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(seen).toHaveLength(0);
  });
});

describe('Resume', () => {
  it('shows a paused queue with a Paused badge, asks first, and sends { paused: false }', async () => {
    const user = userEvent.setup();
    await apiPost(PAUSE, { paused: true, reason: 'Held for a test' });
    const seen = recordRequests('post', PAUSE);
    await openHealthPage({ scenario: 'healthy', route: ROUTE });
    // A paused queue is never folded away, even in a healthy platform.
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    expect(within(row).getByText('Paused')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Resume orders.dispatch' }));

    const dialog = await screen.findByRole('dialog', { name: RESUME_TITLE });
    expect(dialog).toHaveTextContent('Workers take jobs from orders.dispatch again');
    await user.click(within(dialog).getByRole('button', { name: 'Resume queue' }));
    await waitFor(() => expect(seen).toHaveLength(1), SLOW);
    expect(seen[0].body).toEqual({ paused: false });
    expect(await screen.findByText('orders.dispatch resumed', undefined, SLOW)).toBeInTheDocument();
  });
});

describe('Retry all failed', () => {
  it('states how many jobs it retries, sends { all: true }, and tells how many the server retried', async () => {
    const user = userEvent.setup();
    const seen = recordRequests('post', '/admin/system/queues/orders.dispatch/retry');
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    await user.click(within(row).getByRole('button', { name: 'Retry all failed jobs of orders.dispatch' }));

    const dialog = await screen.findByRole('dialog', { name: RETRY_ALL_TITLE });
    expect(dialog).toHaveTextContent('Retries 23 failed jobs of orders.dispatch now.');
    await user.click(within(dialog).getByRole('button', { name: 'Retry all failed' }));
    await waitFor(() => expect(seen).toHaveLength(1), SLOW);
    expect(seen[0].body).toEqual({ all: true });
    expect(await screen.findByText('Retried 23 failed jobs', undefined, SLOW)).toBeInTheDocument();
    // The failed jobs are gone from the list, so the control for them goes too.
    await waitFor(() => {
      const after = rowOf(screen.getByRole('table', { name: 'Queues' }), 'orders.dispatch');
      expect(within(after).queryByRole('button', { name: /^Retry all failed/ })).not.toBeInTheDocument();
    }, SLOW);
  });
});

describe('Run now', () => {
  it('states that the run is outside the schedule and manual, then starts the job', async () => {
    const user = userEvent.setup();
    const seen = recordRequests('post', '/admin/system/jobs/price_sync/run');
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await jobsTable(), 'price_sync');
    await user.click(within(row).getByRole('button', { name: 'Run now price_sync' }));

    const dialog = await screen.findByRole('dialog', { name: 'Run Supplier price sync now?' });
    expect(dialog).toHaveTextContent(
      'Supplier price sync runs now, outside its schedule (recorded as manual).',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));
    await waitFor(() => expect(seen).toHaveLength(1), SLOW);
    expect(await screen.findByText('Supplier price sync started', undefined, SLOW)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SLOW);
  });

  it("keeps the dialog open and shows the server's message when the job is already running", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/system/jobs/price_sync/run', () =>
        problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Job already running',
          'Supplier price sync is running now. Wait for it to finish.',
        ),
      ),
    );
    await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await jobsTable(), 'price_sync');
    await user.click(within(row).getByRole('button', { name: 'Run now price_sync' }));
    const dialog = await screen.findByRole('dialog', { name: 'Run Supplier price sync now?' });
    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));
    expect(
      await within(dialog).findByText(
        'Supplier price sync is running now. Wait for it to finish.',
        undefined,
        SLOW,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Supplier price sync started')).not.toBeInTheDocument();
    // The refusal is shown once, in the dialog: an error toast would carry the problem's title.
    expect(screen.queryByText('Job already running')).not.toBeInTheDocument();
  });

  it('names a job whose label is empty by its name in the title, the sentence and the toast', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/system/jobs', () =>
        HttpResponse.json<JobsResponse>({
          jobs: [
            {
              name: 'price_sync',
              label: '',
              schedule: '*/15 * * * *',
              scheduleText: 'Every 15 minutes',
              state: 'warn',
              running: false,
              lastRun: null,
              nextRunAt: null,
            },
          ],
          runs: [],
        }),
      ),
    );
    await openHealthPage({ route: ROUTE });
    const row = rowOf(await jobsTable(), 'price_sync');
    await user.click(within(row).getByRole('button', { name: 'Run now price_sync' }));

    const dialog = await screen.findByRole('dialog', { name: 'Run price_sync now?' });
    expect(dialog).toHaveTextContent('price_sync runs now, outside its schedule (recorded as manual).');
    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));
    expect(await screen.findByText('price_sync started', undefined, SLOW)).toBeInTheDocument();
  });
});
