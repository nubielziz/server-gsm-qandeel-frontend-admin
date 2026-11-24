// Tests for the Notification log tab, run through the whole app against the dev mock API: the page of messages with masked recipients, the
// filter and pager kept in the address, the details drawer (also from a link), and the error and empty states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, openSettings } from '../test/settingsPage';

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

describe('a message from before a channel was retired', () => {
  it('shows the channel word as it was stored', async () => {
    mockServer.use(
      http.get('*/admin/notifications', () =>
        HttpResponse.json(
          [
            {
              id: 1,
              event: 'order.completed',
              channel: 'telegram',
              status: 'sent',
              recipient: '@a***',
              recipientType: 'client',
              recipientId: 1,
              campaignId: null,
              attempts: 1,
              sentAt: '2026-11-10T09:00:00.000Z',
              createdAt: '2026-11-10T09:00:00.000Z',
              updatedAt: '2026-11-10T09:00:00.000Z',
            },
          ],
          { headers: { 'x-total-count': '1' } },
        ),
      ),
    );
    await openSettings(LOG);
    const [row] = await dataRows();
    expect(within(row).getByText('telegram')).toBeInTheDocument();
    expect(within(row).getByText('Sent')).toBeInTheDocument();
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

  it('has no channel filter and says when nothing matches', async () => {
    const user = userEvent.setup();
    await openSettings(LOG);
    await dataRows();
    expect(screen.queryByRole('combobox', { name: 'Filter by channel' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'queued');
    expect(await screen.findByText(/messages?$/)).toBeInTheDocument();
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

describe('the notification campaign filter', () => {
  /** A log row of a campaign (7) and one of an event, served in place of the mock rows; the addresses asked are recorded. */
  function serveLog() {
    const asked: URL[] = [];
    const row = (id: number, campaignId: number | null) => ({
      id,
      event: 'broadcast.announcement',
      channel: 'email',
      status: 'sent',
      recipient: 'a***b@example.com',
      recipientType: 'client',
      recipientId: 1,
      campaignId,
      attempts: 1,
      sentAt: '2026-11-10T09:00:00.000Z',
      createdAt: '2026-11-10T09:00:00.000Z',
      updatedAt: '2026-11-10T09:00:00.000Z',
    });
    mockServer.use(
      http.get('*/admin/notifications', ({ request }) => {
        asked.push(new URL(request.url));
        return HttpResponse.json([row(2, 7), row(1, null)], { headers: { 'x-total-count': '2' } });
      }),
    );
    return asked;
  }

  it('sends campaignId to the server, shows a chip, and clears it again from the chip', async () => {
    const user = userEvent.setup();
    const asked = serveLog();
    const app = await openSettings(`${LOG}&campaignId=7`);
    await dataRows();
    expect(asked[0].searchParams.get('campaignId')).toBe('7');
    expect(screen.getByRole('button', { name: 'Clear the filter: campaign 7' })).toHaveTextContent(
      'Campaign #7',
    );
    await user.click(screen.getByRole('button', { name: 'Clear the filter: campaign 7' }));
    expect(app.location()).toBe(LOG);
    await waitFor(() => expect(asked.at(-1)?.searchParams.has('campaignId')).toBe(false));
    expect(screen.queryByRole('button', { name: /Clear the filter/ })).not.toBeInTheDocument();
  });

  it("links a campaign's message to the campaign and shows a dash for an event's message", async () => {
    serveLog();
    await openSettings(LOG);
    const [campaignRow, eventRow] = await dataRows();
    expect(within(campaignRow).getByRole('link', { name: 'Campaign #7' })).toHaveAttribute(
      'href',
      '/notifications/7',
    );
    expect(within(eventRow).queryByRole('link')).not.toBeInTheDocument();
    expect(within(eventRow).getByText('–')).toBeInTheDocument();
  });

  it('keeps the campaign filter next to the other filters and ignores one that is not an id', async () => {
    const asked = serveLog();
    await openSettings(`${LOG}&status=sent&campaignId=abc`);
    await dataRows();
    expect(asked[0].searchParams.get('status')).toBe('sent');
    expect(asked[0].searchParams.has('campaignId')).toBe(false);
    expect(screen.queryByRole('button', { name: /Clear the filter/ })).not.toBeInTheDocument();
  });

  it('says no messages match when the campaign has none, instead of "No messages yet"', async () => {
    mockServer.use(
      http.get('*/admin/notifications', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await openSettings(`${LOG}&campaignId=7`);
    expect(await screen.findByText('No messages match')).toBeInTheDocument();
  });
});

describe('the details drawer', () => {
  it('opens from a row and shows the failure reason and the data the message was built from', async () => {
    const user = userEvent.setup();
    const app = await openSettings(`${LOG}&status=failed`);
    // The newest failed message (the 4th) was made from the Support reply template; every failed message may share it, so the row is the first one.
    const [first] = await dataRows();
    await user.click(within(first).getByText('Failed'));
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
    const drawer = within(await screen.findByRole('dialog', { name: 'Support reply' }));
    expect(await drawer.findByText('support.reply')).toBeInTheDocument();
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
