// Tests for the Notification log tab, run through the whole app against the dev mock API: the page of messages with masked recipients, the
// filters and pager kept in the address, the details drawer (also from a link), and the error and empty states.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, openSettings, rowOf } from '../test/settingsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const LOG = '/settings?tab=log';
const TABLE = 'Notification log';
/** Data rows of the log table (the header row is left out). */
const dataRows = async () =>
  within(await screen.findByRole('table', { name: TABLE }))
    .getAllByRole('row')
    .slice(1);

describe('the list', () => {
  it('shows the newest messages first with the recipient as the server masked it', async () => {
    await openSettings(LOG);
    const rows = await dataRows();
    expect(rows).toHaveLength(25);
    expect(within(rows[0]).getByText('Order received')).toBeInTheDocument();
    expect(within(rows[0]).getByText('order.received')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/^[a-z]\*\*\*[a-z]@example\.com$/)).toBeInTheDocument();
    expect(within(rows[0]).getByText('Sent')).toBeInTheDocument();
    expect(await screen.findByText('48 messages')).toBeInTheDocument();
    expect(screen.getByText('1–25 of 48')).toBeInTheDocument();
  });

  it('goes to the next page and keeps the page in the address', async () => {
    const user = userEvent.setup();
    const app = await openSettings(LOG);
    await dataRows();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('26–48 of 48')).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=log&page=2');
    expect(await dataRows()).toHaveLength(23);
  });
});

describe('the filters', () => {
  it('shows only the failed messages and keeps the filter in the address', async () => {
    const user = userEvent.setup();
    const app = await openSettings(LOG);
    await dataRows();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'failed');
    expect(await screen.findByText('7 messages')).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=log&status=failed');
    for (const row of await dataRows()) expect(within(row).getByText('Failed')).toBeInTheDocument();
  });

  it('filters by channel and says when nothing matches', async () => {
    const user = userEvent.setup();
    await openSettings(LOG);
    await dataRows();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by channel' }), 'telegram');
    const rows = await screen.findByText(/messages?$/);
    expect(rows).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'queued');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by channel' }), 'telegram');
    mockServer.use(
      http.get('*/admin/notifications', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'failed');
    expect(await screen.findByText('No messages match')).toBeInTheDocument();
  });

  it('opens with the filters of the address', async () => {
    await openSettings(`${LOG}&status=failed&page=1`);
    expect(await screen.findByText('7 messages')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('failed');
  });
});

describe('the details drawer', () => {
  it('opens from a row and shows the failure reason and the data the message was built from', async () => {
    const user = userEvent.setup();
    const app = await openSettings(`${LOG}&status=failed`);
    await user.click((await rowOf(TABLE, 'Support reply')).getByText('Failed'));
    const drawer = dialogOf('Support reply');
    expect(await drawer.findByText('The mailbox does not exist.')).toBeInTheDocument();
    expect(drawer.getByText(/^[a-z]\*\*\*[a-z]@example\.com$/)).toBeInTheDocument();
    expect(drawer.getByText('Not sent')).toBeInTheDocument();
    expect(drawer.getByText(/"orderId": "SF-\d+"/)).toBeInTheDocument();
    expect(app.location()).toMatch(/&notification=\d+$/);
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    expect(app.location()).toBe('/settings?tab=log&status=failed');
  });

  it('opens from a link, even for a message that is not on the page', async () => {
    // Message 3 is the 46th newest, so it is on page 2.
    await openSettings(`${LOG}&notification=3`);
    const drawer = within(await screen.findByRole('dialog', { name: 'Payment failed' }));
    expect(await drawer.findByText('payment.failed')).toBeInTheDocument();
    expect(drawer.getByText('Failed')).toBeInTheDocument();
    expect(await drawer.findByText('The mailbox does not exist.')).toBeInTheDocument();
  });

  it('says so, with a Retry, when the message cannot be read', async () => {
    mockServer.use(
      http.get('*/admin/notifications/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'No notification with id 999.'),
      ),
    );
    await openSettings(`${LOG}&notification=999`);
    expect(
      await within(await screen.findByRole('dialog')).findByText('Could not load this record'),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('the states', () => {
  it('says so, with a Retry, when the log could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/notifications', () => problem(500, 'INTERNAL', 'Server error', 'The log is down.')),
    );
    await openSettings(LOG);
    expect(await screen.findByText('Could not load the notification log')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect((await dataRows()).length).toBeGreaterThan(0);
  });

  it('shows an empty state when nothing was sent yet', async () => {
    mockServer.use(
      http.get('*/admin/notifications', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await openSettings(LOG);
    expect(await screen.findByText('No messages yet')).toBeInTheDocument();
  });

  it('goes back to the last page when an old link points past the end', async () => {
    const app = await openSettings(`${LOG}&page=9`);
    expect(await screen.findByText('26–48 of 48')).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=log&page=2');
  });
});
