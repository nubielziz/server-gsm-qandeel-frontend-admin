// Tests for the Webhook deliveries tab, run through the whole app against the dev mock API: the page of deliveries, search and status
// filter kept in the address, the details drawer with the request and the merchant's answer, Retry with the server's refusal, permissions.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getWebhookDelivery } from '../api';
import { dialogOf, openSettings } from '../test/settingsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const HOOKS = '/settings?tab=webhooks';
const TABLE = 'Webhook deliveries';
const dataRows = async () =>
  within(await screen.findByRole('table', { name: TABLE }))
    .getAllByRole('row')
    .slice(1);

describe('the list', () => {
  it('shows the merchant, event, address, answer and attempts of each delivery', async () => {
    await openSettings(HOOKS);
    const rows = await dataRows();
    expect(rows).toHaveLength(25);
    const first = within(rows[0]);
    expect(first.getByText('Zain Mobile Hub')).toBeInTheDocument();
    expect(first.getByText('order.completed')).toBeInTheDocument();
    expect(first.getByText('hooks.zain-mobile-hub.example')).toBeInTheDocument();
    expect(first.getByText('200')).toBeInTheDocument();
    expect(first.getByText('Delivered')).toBeInTheDocument();
    expect(await screen.findByText('36 deliveries')).toBeInTheDocument();
  });

  it('shows failures with the answer code, or No answer when the merchant never replied', async () => {
    const user = userEvent.setup();
    const app = await openSettings(HOOKS);
    await dataRows();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'failed');
    expect(await screen.findByText('8 deliveries')).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=webhooks&status=failed');
    const rows = await dataRows();
    expect(rows.some((row) => within(row).queryByText('500'))).toBe(true);
    expect(rows.some((row) => within(row).queryByText('No answer'))).toBe(true);
  });

  it('searches by merchant after a short pause and keeps the search in the address', async () => {
    const user = userEvent.setup();
    const app = await openSettings(HOOKS);
    await dataRows();
    await user.type(screen.getByRole('searchbox', { name: 'Search merchant, event, address' }), 'Al-Noor');
    await waitFor(() => expect(app.location()).toBe('/settings?tab=webhooks&q=Al-Noor'));
    expect(await screen.findByText('9 deliveries')).toBeInTheDocument();
    for (const row of await dataRows()) expect(within(row).getByText('Al-Noor Telecom')).toBeInTheDocument();
  });

  it('says so when a search finds nothing', async () => {
    await openSettings(`${HOOKS}&q=nobody`);
    expect(await screen.findByText('No deliveries match')).toBeInTheDocument();
  });
});

describe('the details drawer', () => {
  it('shows the request that was sent and what the merchant answered', async () => {
    const user = userEvent.setup();
    const app = await openSettings(`${HOOKS}&status=failed`);
    // Delivery 34 is the newest failed one: Phone Doctor FZE’s server answered 500.
    await user.click((await dataRows())[0].querySelector('td') as HTMLElement);
    const drawer = dialogOf('Deposit approved');
    expect(await drawer.findByText('Request')).toBeInTheDocument();
    expect(drawer.getByText(/"orderId": \d+/)).toBeInTheDocument();
    expect(drawer.getByText('{"error":"internal"}')).toBeInTheDocument();
    expect(drawer.getByText('Failed')).toBeInTheDocument();
    expect(drawer.getByText('Attempts')).toBeInTheDocument();
    expect(drawer.getByRole('link', { name: 'Phone Doctor FZE' })).toHaveAttribute('href', '/merchants/3');
    expect(drawer.getByText('https://hooks.phone-doctor-fze.example/gsm')).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=webhooks&status=failed&delivery=34');
  });

  it('opens from a link and shows the network error when the merchant did not answer', async () => {
    // Delivery 31 never got an answer.
    await openSettings(`${HOOKS}&delivery=31`);
    const drawer = within(await screen.findByRole('dialog'));
    expect(
      await drawer.findByText('The merchant’s server did not answer in 10 seconds.'),
    ).toBeInTheDocument();
    expect(drawer.getAllByText('No answer').length).toBeGreaterThan(0);
  });
});

describe('Retry', () => {
  it('asks the server to send a failed delivery again and shows it waiting', async () => {
    const user = userEvent.setup();
    await openSettings(`${HOOKS}&delivery=34`);
    const drawer = within(await screen.findByRole('dialog'));
    await drawer.findByText('Request');
    await user.click(drawer.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Sending again')).toBeInTheDocument();
    await waitFor(() => expect(drawer.getByText('Waiting')).toBeInTheDocument());
    expect((await getWebhookDelivery(34)).status).toBe('pending');
  });

  it('shows the server’s refusal inside the drawer', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/webhook-deliveries/:id/retry', () =>
        problem(429, 'RATE_LIMITED', 'Too many retries', 'This delivery was retried a moment ago.'),
      ),
    );
    await openSettings(`${HOOKS}&delivery=34`);
    const drawer = within(await screen.findByRole('dialog'));
    await drawer.findByText('Request');
    await user.click(drawer.getByRole('button', { name: 'Retry' }));
    expect(await drawer.findByText('This delivery was retried a moment ago.')).toBeInTheDocument();
  });

  it('is off for a delivery that already worked', async () => {
    await openSettings(`${HOOKS}&delivery=36`);
    const drawer = within(await screen.findByRole('dialog'));
    await drawer.findByText('Request');
    const retry = drawer.getByRole('button', { name: 'Retry' });
    expect(retry).toBeDisabled();
    expect(retry).toHaveAttribute('title', 'This delivery already worked');
  });
});

describe('permissions and states', () => {
  it('lets a reader see a delivery but not retry it, and names the missing permission', async () => {
    await openSettings(`${HOOKS}&delivery=34`, { permissions: ['webhooks:read'] });
    const drawer = within(await screen.findByRole('dialog'));
    await drawer.findByText('Request');
    const retry = drawer.getByRole('button', { name: 'Retry' });
    expect(retry).toBeDisabled();
    expect(retry).toHaveAttribute('title', 'You need the webhooks:update permission');
  });

  it('says so, with a Retry, when the log could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/webhook-deliveries', () =>
        problem(500, 'INTERNAL', 'Server error', 'The log is down.'),
      ),
    );
    await openSettings(HOOKS);
    expect(await screen.findByText('Could not load the webhook deliveries')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect((await dataRows()).length).toBeGreaterThan(0);
  });
});
