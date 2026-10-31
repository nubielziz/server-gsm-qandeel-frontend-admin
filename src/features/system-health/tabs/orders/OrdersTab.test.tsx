// Tests for the Orders & suppliers tab, run through the whole app against the dev mock API: the pipeline card and the suppliers
// card in the healthy and degraded scenarios, links by permission, Pause and Resume with their dialog, read-only staff, and a
// failing read that must not blank the other card.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage, type OpenHealthOptions } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { recordRequests } from '../../test/recordRequests';
import { measure, supplier, suppliersHealth } from './ordersFixture';

setupHealthMocks();
// The page and the tab are lazy chunks and every flow goes through the mock API, so give a test room.
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const READ_ONLY = ['system:read', 'orders:read', 'suppliers:read', 'risk:read'];

/** Opens the tab and returns both cards, once each has its heading. */
async function openOrders(options: OpenHealthOptions = {}) {
  const app = await openHealthPage({ route: '/system-health?tab=orders', ...options });
  const pipeline = within(await screen.findByRole('region', { name: 'Order pipeline' }, SLOW));
  const suppliers = within(await screen.findByRole('region', { name: 'Suppliers' }, SLOW));
  return { app, pipeline, suppliers };
}

/** The names of the first cell of each body row of a table, in order. */
const firstCells = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('the order pipeline in the healthy scenario', () => {
  it('shows the figures, the single past-SLA row with its link, the service types and the held-by-risk line', async () => {
    const { pipeline } = await openOrders({ scenario: 'healthy' });
    const figure = (name: string) => pipeline.getByRole('group', { name });
    expect(figure('Orders past SLA')).toHaveTextContent('1');
    expect(figure('Orders past SLA')).toHaveTextContent('warn 5');
    expect(figure('Money held')).toHaveTextContent('$24.50');
    expect(figure('Dispatch p95')).toHaveTextContent(/\d+s/);
    expect(figure('Dispatch p95')).toHaveTextContent('warn 2m');
    expect(figure('Needs attention')).toHaveTextContent('3');

    const stuck = await pipeline.findByRole('table', { name: 'Orders past SLA by status' });
    const row = within(stuck).getByRole('row', { name: /Processing/ });
    expect(within(row).getByRole('link', { name: 'Processing' })).toHaveAttribute(
      'href',
      '/orders?tab=processing&pastSla=true',
    );
    expect(row).toHaveTextContent('$24.50');
    expect(row).toHaveTextContent(/52m/);

    const types = pipeline.getByRole('table', { name: 'Finished orders by service type, last 24 hours' });
    expect(firstCells(types)).toEqual(['IMEI', 'Server', 'Remote', 'File']);
    expect(
      within(within(types).getByRole('row', { name: /IMEI/ })).getAllByRole('cell')[2],
    ).toHaveTextContent('98.8 %');

    const held = pipeline.getByRole('region', { name: 'Held by risk' });
    expect(held).toHaveTextContent(/2 orders · \$86\.00 · oldest 2h/);
    expect(within(held).getByRole('link', { name: 'Open the review queue' })).toHaveAttribute(
      'href',
      '/risk?tab=queue',
    );
  });
});

describe('the order pipeline in the degraded scenario', () => {
  it('shows the money held and one linked row per status, and puts the failing service type first', async () => {
    const { pipeline } = await openOrders({ scenario: 'degraded' });
    expect(pipeline.getByRole('group', { name: 'Orders past SLA' })).toHaveTextContent('23');
    // The state of the count is the server's: an icon and a word for a screen reader, not a colour only.
    expect(pipeline.getByRole('group', { name: 'Orders past SLA' })).toHaveTextContent('Critical');
    expect(pipeline.getByRole('group', { name: 'Money held' })).toHaveTextContent('$1,240.00');
    expect(pipeline.getByRole('group', { name: 'Dispatch p95' })).toHaveTextContent('Warn');

    const stuck = await pipeline.findByRole('table', { name: 'Orders past SLA by status' });
    expect(firstCells(stuck)).toEqual(['Processing', 'Needs attention', 'Pending']);
    const links = within(stuck)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(links).toEqual([
      '/orders?tab=processing&pastSla=true',
      '/orders?tab=review&pastSla=true',
      '/orders?tab=queued&pastSla=true',
    ]);
    expect(within(stuck).getByRole('row', { name: /Needs attention/ })).toHaveTextContent('$336.25');

    const types = pipeline.getByRole('table', { name: 'Finished orders by service type, last 24 hours' });
    expect(firstCells(types)[0]).toBe('IMEI');
    const imei = within(types).getByRole('row', { name: /IMEI/ });
    expect(imei).toHaveTextContent('88.8 %');
    expect(imei).toHaveTextContent('11.2 %');
    expect(imei).toHaveTextContent('Critical');
  });

  it('opens the Orders page filtered to the status when a row is clicked', async () => {
    const user = userEvent.setup();
    const { app, pipeline } = await openOrders({ scenario: 'degraded' });
    const stuck = await pipeline.findByRole('table', { name: 'Orders past SLA by status' });
    await user.click(within(stuck).getByRole('cell', { name: '14' }));
    await waitFor(() => expect(app.location()).toBe('/orders?tab=processing&pastSla=true'), SLOW);
  });
});

describe('links follow what the staff member may read', () => {
  it('makes the statuses, supplier names and the review queue plain text without orders, suppliers and risk access', async () => {
    const { pipeline, suppliers } = await openOrders({
      scenario: 'degraded',
      permissions: ['system:read', 'suppliers:update'],
    });
    const stuck = await pipeline.findByRole('table', { name: 'Orders past SLA by status' });
    expect(within(stuck).queryByRole('link')).not.toBeInTheDocument();
    expect(within(stuck).getByText('Processing')).toBeInTheDocument();
    expect(pipeline.queryByRole('link', { name: 'Open the review queue' })).not.toBeInTheDocument();
    expect(pipeline.getByRole('region', { name: 'Held by risk' })).toHaveTextContent('3 orders');

    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
    expect(within(table).getByText('Rapid IMEI')).toBeInTheDocument();
    // This staff member can still pause: the buttons are not tied to reading the Suppliers page.
    expect(within(table).getAllByRole('button', { name: 'Pause' })).toHaveLength(2);
  });
});

describe('the suppliers card', () => {
  it('lists the one supplier that needs a look and keeps the healthy ones behind a quiet line with Show', async () => {
    const user = userEvent.setup();
    const { suppliers } = await openOrders({ scenario: 'healthy' });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    expect(suppliers.getByText('6 suppliers · 1 needs attention')).toBeInTheDocument();
    expect(firstCells(table)).toEqual(['Gulf Server Hub']);
    const row = within(table).getByRole('row', { name: /Gulf Server Hub/ });
    expect(within(row).getByRole('link', { name: 'Gulf Server Hub' })).toHaveAttribute(
      'href',
      '/suppliers?supplier=2',
    );
    // The low balance is the only reason this row is here, so it is said in words and the amount takes the warn tone:
    // never an icon alone.
    expect(within(row).getByText('$38.40')).toHaveClass('text-warn-fg');
    expect(within(row).getByText('Low balance')).toBeInTheDocument();
    expect(within(row).getByText('Closed')).toBeInTheDocument();

    const show = suppliers.getByRole('button', { name: 'Show the healthy suppliers' });
    expect(show).toHaveAttribute('aria-expanded', 'false');
    expect(suppliers.getByText('5 suppliers healthy')).toBeInTheDocument();
    expect(suppliers.queryByText('Nordic GSM')).not.toBeInTheDocument();

    await user.click(show);
    // The healthy ones join the same table, below the problem: one header, columns in line.
    const all = await suppliers.findByRole('table', { name: 'All suppliers' });
    expect(firstCells(all)).toEqual([
      'Gulf Server Hub',
      'Nordic GSM',
      'Rapid IMEI',
      'RemoteDesk Pro',
      'FileForge',
      'Bosphorus Unlock',
    ]);
    expect(suppliers.getByRole('button', { name: 'Hide the healthy suppliers' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.click(suppliers.getByRole('button', { name: 'Hide the healthy suppliers' }));
    expect(suppliers.queryByRole('table', { name: 'All suppliers' })).not.toBeInTheDocument();
    expect(firstCells(suppliers.getByRole('table', { name: 'Suppliers that need attention' }))).toEqual([
      'Gulf Server Hub',
    ]);
  });

  it('puts the down supplier first with its badge, since-time, rates, open circuit and balance', async () => {
    const { suppliers } = await openOrders({ scenario: 'degraded' });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    expect(firstCells(table)).toEqual(['Rapid IMEI', 'Gulf Server Hub']);
    expect(suppliers.getByText('6 suppliers · 2 need attention')).toBeInTheDocument();
    const row = within(table).getByRole('row', { name: /Rapid IMEI/ });
    const cells = within(row).getAllByRole('cell');
    // Supplier, Health, Latency, Error rate, Timeout rate, Circuit, Last success, Last sync, Balance, actions.
    expect(cells).toHaveLength(10);
    expect(cells[1]).toHaveTextContent('Down');
    expect(cells[1]).toHaveTextContent(/^Downsince .+ \(\d+m\)$/);
    expect(cells[2]).toHaveTextContent(/\d(\.\d)? s/);
    expect(cells[3]).toHaveTextContent(/%/);
    expect(cells[4]).toHaveTextContent(/%/);
    expect(cells[5]).toHaveTextContent('Open');
    expect(cells[6]).toHaveTextContent(/ago|just now/);
    expect(cells[8]).toHaveTextContent('$640.00');
    expect(within(cells[9]).getByRole('button', { name: 'Pause' })).toBeEnabled();
    // jsdom has no layout, so check the classes that decide it: an open circuit is never hidden while the table shows
    // (below 768px the cards show it), and the timeout rate is the column that drops out below xl.
    expect(within(table).getByRole('columnheader', { name: 'Circuit' })).not.toHaveClass('hidden');
    expect(within(table).getByRole('columnheader', { name: 'Timeout rate' })).toHaveClass(
      'hidden',
      'xl:table-cell',
    );
    // The other supplier needs a look only because of its balance: the row says so.
    expect(
      within(within(table).getByRole('row', { name: /Gulf Server Hub/ })).getByText('Low balance'),
    ).toBeInTheDocument();
  });

  it('never draws missing data as healthy, shows Paused and Disabled by the switch, and a balance in its own currency', async () => {
    mockServer.use(
      http.get('*/admin/system/suppliers', () =>
        HttpResponse.json(
          suppliersHealth([
            supplier({
              id: 7,
              name: 'Mystery Hub',
              health: 'unknown',
              lastSuccessAt: null,
              lastSyncAt: null,
              latency: measure(null, 'ms', 'unknown'),
              errorRate: measure(null, 'percent', 'unknown'),
              timeoutRate: measure(null, 'percent', 'unknown'),
              balance: { amount: 'n/a', currency: 'USD', state: 'unknown', checkedAt: null },
            }),
            supplier({ id: 8, name: 'Paused Hub', status: 'paused', health: 'down' }),
            supplier({
              id: 9,
              name: 'Euro Hub',
              balance: { amount: '1850.0000', currency: 'EUR', state: 'ok', checkedAt: null },
            }),
            supplier({ id: 10, name: 'Old Hub', status: 'disabled', health: 'unknown', lastSuccessAt: null }),
          ]),
        ),
      ),
    );
    const user = userEvent.setup();
    const { suppliers } = await openOrders({ scenario: 'healthy' });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    // No data first, then paused; the healthy and disabled ones wait behind the line.
    expect(firstCells(table)).toEqual(['Mystery Hub', 'Paused Hub']);
    const mystery = within(table).getByRole('row', { name: /Mystery Hub/ });
    expect(within(mystery).getByText('Unknown')).toBeInTheDocument();
    expect(within(mystery).queryByText('OK')).not.toBeInTheDocument();
    // Latency, error rate, timeout rate, last success, last sync and balance: all "No data".
    expect(within(mystery).getAllByText('No data')).toHaveLength(6);
    const paused = within(table).getByRole('row', { name: /Paused Hub/ });
    expect(within(paused).getByText('Paused')).toBeInTheDocument();
    expect(within(paused).queryByText('Down')).not.toBeInTheDocument();
    expect(within(paused).getByRole('button', { name: 'Resume' })).toBeEnabled();

    expect(suppliers.getByText('1 supplier healthy · 1 disabled')).toBeInTheDocument();
    await user.click(suppliers.getByRole('button', { name: 'Show the healthy suppliers' }));
    const all = await suppliers.findByRole('table', { name: 'All suppliers' });
    expect(firstCells(all)).toEqual(['Mystery Hub', 'Paused Hub', 'Euro Hub', 'Old Hub']);
    expect(within(all).getByText('EUR 1,850.00')).toBeInTheDocument();
    const old = within(all).getByRole('row', { name: /Old Hub/ });
    expect(within(old).getByText('Disabled')).toBeInTheDocument();
    // Enabling a disabled supplier is the Suppliers page's job: no button here.
    expect(within(old).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('the balance column', () => {
  it('says a critical balance and one it cannot judge in words, and gives only the judged amount a status tone', async () => {
    mockServer.use(
      http.get('*/admin/system/suppliers', () =>
        HttpResponse.json(
          suppliersHealth([
            supplier({
              id: 7,
              name: 'Dry Hub',
              balance: { amount: '2.5000', currency: 'USD', state: 'crit', checkedAt: null },
            }),
            supplier({
              id: 8,
              name: 'Fog Hub',
              balance: { amount: '640.0000', currency: 'USD', state: 'unknown', checkedAt: null },
            }),
            supplier({ id: 9, name: 'Calm Hub' }),
          ]),
        ),
      ),
    );
    const { suppliers } = await openOrders({ scenario: 'healthy' });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    expect(firstCells(table)).toEqual(['Dry Hub', 'Fog Hub']);
    const dry = within(table).getByRole('row', { name: /Dry Hub/ });
    expect(within(dry).getByText('$2.50')).toHaveClass('text-crit-fg');
    expect(within(dry).getByText('Very low balance')).toBeInTheDocument();
    const fog = within(table).getByRole('row', { name: /Fog Hub/ });
    expect(within(fog).getByText('Balance unknown')).toBeInTheDocument();
    // Unknown is neutral: the amount keeps the plain text colour, so it is neither a problem nor fine.
    expect(within(fog).getByText('$640.00').className).not.toMatch(/text-(good|warn|serious|crit)-fg/);
    expect(within(fog).queryByText('Low balance')).not.toBeInTheDocument();
  });

  it('adds no words and no tone to a balance the server calls ok', async () => {
    const user = userEvent.setup();
    const { suppliers } = await openOrders({ scenario: 'healthy' });
    await user.click(await suppliers.findByRole('button', { name: 'Show the healthy suppliers' }, SLOW));
    const all = await suppliers.findByRole('table', { name: 'All suppliers' });
    // Six suppliers and one low balance: the other five say nothing about theirs.
    expect(within(all).getAllByText('Low balance')).toHaveLength(1);
    expect(within(all).queryByText('Very low balance')).not.toBeInTheDocument();
    expect(within(all).queryByText('Balance unknown')).not.toBeInTheDocument();
    const nordic = within(all).getByRole('row', { name: /Nordic GSM/ });
    expect(within(nordic).getByText(/^\$[\d,]+\.\d\d$/).className).not.toMatch(
      /text-(good|warn|serious|crit)-fg/,
    );
  });
});

describe('a card with nothing in it', () => {
  it('keeps the neutral sub line above the empty state when no supplier is connected', async () => {
    mockServer.use(http.get('*/admin/system/suppliers', () => HttpResponse.json(suppliersHealth([]))));
    const { suppliers } = await openOrders({ scenario: 'healthy' });
    expect(
      await suppliers.findByText(
        'Suppliers appear here once they are connected on the Suppliers page.',
        undefined,
        SLOW,
      ),
    ).toBeInTheDocument();
    expect(suppliers.getByText('Health of each supplier connection, problems first.')).toBeInTheDocument();
    // "0 suppliers · none need attention" would contradict the empty state under it.
    expect(suppliers.queryByText(/none need attention/)).not.toBeInTheDocument();
  });
});

describe('Pause and Resume', () => {
  it('pauses a supplier after a dialog that states the effect, then resumes it the same way', async () => {
    const writes = recordRequests('patch', '/admin/suppliers/3');
    const user = userEvent.setup();
    const { suppliers } = await openOrders({ scenario: 'degraded' });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    await user.click(
      within(within(table).getByRole('row', { name: /Rapid IMEI/ })).getByRole('button', { name: 'Pause' }),
    );

    const pause = within(await screen.findByRole('dialog', { name: 'Pause Rapid IMEI?' }));
    expect(
      pause.getByText(
        'New orders go to the next supplier by priority; orders already sent stay as they are.',
      ),
    ).toBeInTheDocument();
    // Nothing was sent before the confirm.
    expect(writes).toHaveLength(0);
    await user.click(pause.getByRole('button', { name: 'Pause supplier' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].url.pathname).toBe('/admin/suppliers/3');
    expect(writes[0].body).toEqual({ status: 'paused' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Pause Rapid IMEI?' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Rapid IMEI paused')).toBeInTheDocument();

    // The read is made again: the row says Paused and offers Resume.
    const paused = await within(table).findByRole('row', { name: /Rapid IMEI.*Paused/ }, SLOW);
    await user.click(within(paused).getByRole('button', { name: 'Resume' }));
    const resume = within(await screen.findByRole('dialog', { name: 'Resume Rapid IMEI?' }));
    expect(resume.getByText('Rapid IMEI takes new orders again in its priority order.')).toBeInTheDocument();
    await user.click(resume.getByRole('button', { name: 'Resume supplier' }));
    await waitFor(() => expect(writes).toHaveLength(2), SLOW);
    expect(writes[1].body).toEqual({ status: 'active' });
    expect(await screen.findByText('Rapid IMEI resumed')).toBeInTheDocument();
  });

  it('sends nothing when the dialog is cancelled', async () => {
    const writes = recordRequests('patch', '/admin/suppliers/3');
    const user = userEvent.setup();
    const { suppliers } = await openOrders({ scenario: 'degraded' });
    const row = await suppliers.findByRole('row', { name: /Rapid IMEI/ }, SLOW);
    await user.click(within(row).getByRole('button', { name: 'Pause' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Pause Rapid IMEI?' }));
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes).toHaveLength(0);
  });

  it("shows the server's refusal inside the dialog, once, and keeps the dialog open", async () => {
    mockServer.use(
      http.patch('*/admin/suppliers/:id', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the suppliers:update permission.'),
      ),
    );
    const user = userEvent.setup();
    const { suppliers } = await openOrders({ scenario: 'degraded' });
    const row = await suppliers.findByRole('row', { name: /Rapid IMEI/ }, SLOW);
    await user.click(within(row).getByRole('button', { name: 'Pause' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Pause Rapid IMEI?' }));
    await user.click(dialog.getByRole('button', { name: 'Pause supplier' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('You need the suppliers:update permission.');
    // A dialog answers the write, so no toast repeats the message and no success toast appears.
    expect(screen.getAllByText('You need the suppliers:update permission.')).toHaveLength(1);
    expect(screen.queryByText('Rapid IMEI paused')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Pause Rapid IMEI?' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('draws no Pause or Resume button, and no actions column, for a read-only staff member', async () => {
    const { suppliers } = await openOrders({ scenario: 'degraded', permissions: READ_ONLY });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    expect(within(table).getByRole('row', { name: /Rapid IMEI/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Pause|Resume)$/ })).not.toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
    // The data stays: only the controls are gone.
    expect(within(table).getAllByRole('columnheader')).toHaveLength(9);
  });

  it('draws no action button in the read-only scenario either, where the staff member signs in read-only', async () => {
    const { pipeline, suppliers } = await openOrders({ scenario: 'readonly' });
    const table = await suppliers.findByRole('table', { name: 'Suppliers that need attention' });
    expect(within(table).getByRole('row', { name: /Rapid IMEI/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Pause|Resume)$/ })).not.toBeInTheDocument();
    expect(pipeline.getByRole('group', { name: 'Orders past SLA' })).toHaveTextContent('23');
  });

  it('disables Pause with the missing permission as its title for a staff member who can change something else', async () => {
    const { suppliers } = await openOrders({
      scenario: 'degraded',
      permissions: [...READ_ONLY, 'alerts:update'],
    });
    const row = await suppliers.findByRole('row', { name: /Rapid IMEI/ }, SLOW);
    const pause = within(row).getByRole('button', { name: 'Pause' });
    expect(pause).toBeDisabled();
    expect(pause).toHaveAttribute('title', 'You need the suppliers:update permission');
  });
});

describe('a failing read', () => {
  it('shows the 503 of the pipeline with its message, request id and Retry while the suppliers card still renders', async () => {
    const reads = recordRequests('get', '/admin/system/orders-health');
    const user = userEvent.setup();
    const { pipeline, suppliers } = await openOrders({ scenario: 'outage' });
    const alert = await pipeline.findByRole('alert', undefined, SLOW);
    expect(alert).toHaveTextContent('Could not load the order pipeline');
    expect(alert).toHaveTextContent('The database is not accepting connections.');
    expect(alert).toHaveTextContent(/mock-req-\d+/);
    expect(pipeline.queryByRole('group', { name: 'Orders past SLA' })).not.toBeInTheDocument();
    // The other card has its own read: it is not blanked.
    expect(
      await suppliers.findByRole('table', { name: 'Suppliers that need attention' }, SLOW),
    ).toBeInTheDocument();

    const before = reads.length;
    await user.click(pipeline.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(reads.length).toBeGreaterThan(before), SLOW);
  });

  it('shows a note for a card whose answer cannot be drawn and keeps the other card', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockServer.use(
      http.get('*/admin/system/suppliers', () =>
        HttpResponse.json({ checkedAt: new Date().toISOString(), suppliers: null }),
      ),
    );
    const app = await openHealthPage({ route: '/system-health?tab=orders', scenario: 'healthy' });
    expect(app.location()).toBe('/system-health?tab=orders');
    const note = await screen.findByRole('heading', { name: 'The suppliers cannot be shown' }, SLOW);
    expect(note).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Order pipeline' });
    const pipeline = within(region);
    expect(pipeline.getByRole('table', { name: 'Orders past SLA by status' })).toBeInTheDocument();
    // jsdom has no layout, so check the class that gives each part the whole row: the note is a plain panel, and as a bare
    // grid item it would be one of twelve columns (about 90px) wide.
    expect(note.closest('.xl\\:col-span-12')).not.toBeNull();
    expect(region.closest('.xl\\:col-span-12')).not.toBeNull();
  });

  it('does not depend on the monitoring system: with it down both cards still show their data', async () => {
    const { pipeline, suppliers } = await openOrders({ scenario: 'monitoring-down' });
    expect(
      await pipeline.findByRole('table', { name: 'Orders past SLA by status' }, SLOW),
    ).toBeInTheDocument();
    expect(
      await suppliers.findByRole('table', { name: 'Suppliers that need attention' }, SLOW),
    ).toBeInTheDocument();
  });
});
