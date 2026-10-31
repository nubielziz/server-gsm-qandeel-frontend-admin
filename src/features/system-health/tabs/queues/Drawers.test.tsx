// Tests for the two drawers of the Queues & jobs tab, run through the whole app against the dev mock API: the failed jobs
// of `?queue=` (25 a page, Retry one, Retry all, closing clears the address) and the run history of `?job=`, and that only
// one of the two is ever open.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const ROUTE = '/system-health?tab=queues';
const FAILED = '/admin/system/queues/orders.dispatch/failed';

const queuesTable = () => screen.findByRole('table', { name: 'Queues' }, SLOW);
const jobsTable = () => screen.findByRole('table', { name: 'Scheduled jobs' }, SLOW);

/** The table row that holds `text` (a queue or job name). */
const rowOf = (table: HTMLElement, text: string) => {
  const row = within(table).getByText(text).closest('tr');
  if (!row) throw new Error(`No row holds ${text}.`);
  return row;
};

/** The failed-jobs drawer and its list, once the list has loaded. */
async function failedDrawer(queue = 'orders.dispatch') {
  const drawer = await screen.findByRole('dialog', { name: 'Failed jobs' }, SLOW);
  const list = await within(drawer).findByRole('list', { name: `Failed jobs of ${queue}` }, SLOW);
  return { drawer, list, items: within(list).getAllByRole('listitem') };
}

describe('the failed jobs of a queue', () => {
  it('opens from the address with 25 jobs a page, each with its id, name, reason, attempts, time and subject', async () => {
    const user = userEvent.setup();
    const reads = recordRequests('get', FAILED);
    await openHealthPage({ scenario: 'outage', route: `${ROUTE}&queue=orders.dispatch` });
    const { drawer, items } = await failedDrawer();
    expect(items).toHaveLength(25);
    expect(drawer).toHaveTextContent('orders.dispatch');
    expect(within(drawer).getByRole('heading', { name: '61 failed jobs' })).toBeInTheDocument();

    const first = items[0];
    expect(within(first).getByText(/^\d{5}$/)).toHaveClass('mono');
    expect(within(first).getByText('dispatch-order')).toHaveClass('mono');
    expect(within(first).getByText('connect ECONNREFUSED 10.0.3.12:5432')).toBeInTheDocument();
    expect(within(first).getByText('5 of 5 attempts')).toBeInTheDocument();
    expect(within(first).getByText(/^Failed \d{2} \w{3}, \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(within(first).getByText(/^order #\d+$/)).toHaveClass('mono');

    // The first page asked for rows 0 to 25, newest first; the next page asks for rows 25 to 50.
    expect(within(drawer).getByText('1–25 of 61')).toBeInTheDocument();
    expect(reads[0].url.searchParams.get('_start')).toBe('0');
    expect(reads[0].url.searchParams.get('_end')).toBe('25');
    expect(reads[0].url.searchParams.get('_sort')).toBe('failedAt');
    expect(reads[0].url.searchParams.get('_order')).toBe('desc');
    await user.click(within(drawer).getByRole('button', { name: 'Next page' }));
    expect(await within(drawer).findByText('26–50 of 61', undefined, SLOW)).toBeInTheDocument();
    expect(
      reads.some(
        (read) => read.url.searchParams.get('_start') === '25' && read.url.searchParams.get('_end') === '50',
      ),
    ).toBe(true);
    expect(within(drawer).getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });

  it('clears ?queue= when the drawer is closed with its Close button', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&queue=orders.dispatch` });
    const { drawer } = await failedDrawer();
    expect(app.location()).toBe(`${ROUTE}&queue=orders.dispatch`);
    await user.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(app.location()).toBe(ROUTE), SLOW);
    expect(screen.queryByRole('dialog', { name: 'Failed jobs' })).not.toBeInTheDocument();
  });

  it('clears ?queue= on Escape too', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&queue=orders.dispatch` });
    await failedDrawer();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(app.location()).toBe(ROUTE), SLOW);
    expect(screen.queryByRole('dialog', { name: 'Failed jobs' })).not.toBeInTheDocument();
  });

  it('starts the next page at its first row and keeps the gap above the card in view', async () => {
    const user = userEvent.setup();
    // jsdom cannot scroll and has no `scrollIntoView`; this one records which element it was asked to bring into view.
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      await openHealthPage({ scenario: 'outage', route: `${ROUTE}&queue=orders.dispatch` });
      const { drawer } = await failedDrawer();
      await user.click(within(drawer).getByRole('button', { name: 'Next page' }));
      expect(await within(drawer).findByText('26–50 of 61', undefined, SLOW)).toBeInTheDocument();
      expect(scrolled).toHaveLength(1);
      // Bare, the scroll would hide the body's 16px top padding and with it the card's top edge under the header.
      expect(scrolled[0]).toHaveClass('scroll-mt-4');
      expect(drawer.querySelector('.drawer-b')?.firstElementChild).toBe(scrolled[0]);
    } finally {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('opens from the Failed jobs control of a queue row and puts ?queue= in the address', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await queuesTable(), 'orders.dispatch');
    await user.click(within(row).getByRole('button', { name: 'Failed jobs of orders.dispatch' }));
    await waitFor(() => expect(app.location()).toBe(`${ROUTE}&queue=orders.dispatch`), SLOW);
    const { drawer, items } = await failedDrawer();
    expect(items).toHaveLength(23);
    expect(within(drawer).getByRole('heading', { name: '23 failed jobs' })).toBeInTheDocument();
  });

  it('retries one job after a dialog that names it, sends its id, and the list loses that job', async () => {
    const user = userEvent.setup();
    const seen = recordRequests('post', '/admin/system/queues/orders.dispatch/retry');
    await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&queue=orders.dispatch` });
    const { drawer, items } = await failedDrawer();
    const id = within(items[0]).getByText(/^\d{5}$/).textContent ?? '';
    await user.click(within(items[0]).getByRole('button', { name: `Retry job ${id}` }));

    // jsdom puts a space after the inline element in the name, a browser does not: allow one.
    const dialog = await screen.findByRole('dialog', { name: new RegExp(`^Retry job ${id} ?\\?$`) });
    expect(dialog).toHaveTextContent(`Retries job ${id} of orders.dispatch now.`);
    await user.click(within(dialog).getByRole('button', { name: 'Retry job' }));
    await waitFor(() => expect(seen).toHaveLength(1), SLOW);
    expect(seen[0].body).toEqual({ jobId: id });
    expect(await screen.findByText('Retried 1 failed job', undefined, SLOW)).toBeInTheDocument();
    await waitFor(() => expect(drawer).toHaveTextContent('22 failed jobs'), SLOW);
  });

  it('offers Retry all failed in its foot with the count, and sends nothing until it is confirmed', async () => {
    const user = userEvent.setup();
    const seen = recordRequests('post', '/admin/system/queues/orders.dispatch/retry');
    await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&queue=orders.dispatch` });
    const { drawer } = await failedDrawer();
    await user.click(within(drawer).getByRole('button', { name: 'Retry all failed' }));
    const dialog = await screen.findByRole('dialog', {
      name: /^Retry all failed jobs of orders\.dispatch ?\?$/,
    });
    expect(dialog).toHaveTextContent('Retries 23 failed jobs of orders.dispatch now.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Retry all/ })).not.toBeInTheDocument());
    expect(seen).toHaveLength(0);
    // The drawer is still there under the closed dialog.
    expect(screen.getByRole('dialog', { name: 'Failed jobs' })).toBeInTheDocument();
  });

  it('says so, without a Retry all button, when a queue has no failed jobs', async () => {
    await openHealthPage({ scenario: 'healthy', route: `${ROUTE}&queue=risk.assess` });
    const drawer = await screen.findByRole('dialog', { name: 'Failed jobs' }, SLOW);
    expect(await within(drawer).findByText('No failed jobs', undefined, SLOW)).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Retry all failed' })).not.toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it("shows the server's error with Retry in the drawer when the queue is unknown", async () => {
    await openHealthPage({ scenario: 'healthy', route: `${ROUTE}&queue=nope` });
    const drawer = await screen.findByRole('dialog', { name: 'Failed jobs' }, SLOW);
    expect(
      await within(drawer).findByText('Could not load the failed jobs of nope', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(drawer).getByText('No queue with id nope.')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('draws no Retry button for a staff member who can only read', async () => {
    await openHealthPage({
      scenario: 'degraded',
      permissions: ['system:read'],
      route: `${ROUTE}&queue=orders.dispatch`,
    });
    const { drawer, items } = await failedDrawer();
    expect(items).toHaveLength(23);
    expect(within(drawer).queryByRole('button', { name: /^Retry/ })).not.toBeInTheDocument();
  });
});

describe('one drawer at a time', () => {
  it('opens only the failed jobs when the address names a queue and a job, and closing leaves both out', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({
      scenario: 'degraded',
      route: `${ROUTE}&queue=orders.dispatch&job=price_sync`,
    });
    const { drawer } = await failedDrawer();
    expect(screen.queryByRole('dialog', { name: 'Supplier price sync' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await user.click(within(drawer).getByRole('button', { name: 'Close' }));
    // No second drawer was waiting behind the first.
    await waitFor(() => expect(app.location()).toBe(ROUTE), SLOW);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the history of a job alone when the address names only the job', async () => {
    await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&job=price_sync` });
    expect(await screen.findByRole('dialog', { name: 'Supplier price sync' }, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Failed jobs' })).not.toBeInTheDocument();
  });
});

describe('the run history of a job', () => {
  it('opens from the address with the newest run first, how each ended, who started it and what it did', async () => {
    await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&job=price_sync` });
    const drawer = await screen.findByRole('dialog', { name: 'Supplier price sync' }, SLOW);
    expect(drawer).toHaveTextContent('price_sync · Every 15 minutes');
    const list = await within(drawer).findByRole('list', { name: 'Runs of price_sync' }, SLOW);
    const runs = within(list).getAllByRole('listitem');
    expect(runs.length).toBeGreaterThan(10);

    // The slow supplier spoiled the newest run; the one before it ended well and left its own summary.
    expect(within(runs[0]).getByText('Failed')).toBeInTheDocument();
    expect(runs[0]).toHaveTextContent('Rapid IMEI: timeout after 6000 ms');
    expect(runs[0]).toHaveTextContent('On schedule');
    expect(within(runs[1]).getByText('Succeeded')).toBeInTheDocument();
    expect(runs[1]).toHaveTextContent(/suppliers 6 · prices [\d,]+ · changed \d+/);
    expect(runs[1]).toHaveTextContent(/\d+s/);
    expect(within(drawer).getByRole('heading', { name: `${runs.length} runs` })).toBeInTheDocument();
  });

  it('opens from the History control of a job row and clears ?job= when it is closed', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ scenario: 'degraded', route: ROUTE });
    const row = rowOf(await jobsTable(), 'price_sync');
    await user.click(within(row).getByRole('button', { name: 'History of price_sync' }));
    await waitFor(() => expect(app.location()).toBe(`${ROUTE}&job=price_sync`), SLOW);
    const drawer = await screen.findByRole('dialog', { name: 'Supplier price sync' }, SLOW);
    await within(drawer).findByRole('list', { name: 'Runs of price_sync' }, SLOW);
    await user.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(app.location()).toBe(ROUTE), SLOW);
    expect(screen.queryByRole('dialog', { name: 'Supplier price sync' })).not.toBeInTheDocument();
  });

  it('offers Run now in its foot, which opens the same dialog as the table', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded', route: `${ROUTE}&job=price_sync` });
    const drawer = await screen.findByRole('dialog', { name: 'Supplier price sync' }, SLOW);
    await user.click(await within(drawer).findByRole('button', { name: 'Run now' }, SLOW));
    const dialog = await screen.findByRole('dialog', { name: 'Run Supplier price sync now?' });
    expect(dialog).toHaveTextContent(
      'Supplier price sync runs now, outside its schedule (recorded as manual).',
    );
  });

  it('shows the server error with Retry for a job that does not exist, and no Run now', async () => {
    await openHealthPage({ scenario: 'healthy', route: `${ROUTE}&job=nope` });
    const drawer = await screen.findByRole('dialog', { name: 'nope' }, SLOW);
    expect(
      await within(drawer).findByText('Could not load the history of nope', undefined, SLOW),
    ).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Run now' })).not.toBeInTheDocument();
  });
});
