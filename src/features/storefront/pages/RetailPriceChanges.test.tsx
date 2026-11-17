// Tests for the price changes block of the Retail pricing tab: the proposals that wait (shown first), the badge and the figures of
// each kind of change, the Waiting and All views kept in the address, approving and keeping proposals together, the ids the server
// skips, the chip on the tab and the permission of the buttons. The rules block has its own file.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { openStorefront, rowOf, tabTexts, tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const CHANGES = 'Price changes';
const PRICING = '/storefront?tab=pricing';
type User = ReturnType<typeof userEvent.setup>;

/** Opens the tab and waits for the price changes. */
async function openChanges(route = PRICING, options: { permissions?: string[] } = {}) {
  const app = await openStorefront(route, options);
  await tableNamed(CHANGES);
  return app;
}

/** Ticks the row of a service in the price changes table. */
async function tick(user: User, service: string) {
  await user.click((await rowOf(CHANGES, service)).getByRole('checkbox'));
}

/** The last request of a method (a write is followed by the reads it makes stale). */
function lastWrite(requests: ReturnType<typeof recordRequests>, method: string) {
  const found = requests.sent().filter((sent) => sent.method === method);
  const last = found[found.length - 1];
  if (!last) throw new Error(`No ${method} request was sent.`);
  return last;
}

describe('the list', () => {
  it('shows the proposals that wait first, newest first, with their figures and the rule', async () => {
    await openChanges();
    const table = await tableNamed(CHANGES);
    expect(table.getAllByRole('row')).toHaveLength(4); // the header and three proposals
    const rows = table.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByText(/ Unlock$/).textContent)).toEqual([
      'T-Mobile USA Unlock',
      'Vodafone UK iPhone Unlock',
      'Orange France Unlock',
    ]);
    const tmobile = await rowOf(CHANGES, 'T-Mobile USA Unlock');
    expect(tmobile.getByText('IMEI-TMO-USA')).toBeInTheDocument();
    expect(tmobile.getByText('Waiting for approval')).toBeInTheDocument();
    expect(tmobile.getByText('The cost moved more than the rule allows by itself.')).toBeInTheDocument();
    expect(tmobile.getByText('$9.80')).toBeInTheDocument();
    expect(tmobile.getByText('$15.10')).toBeInTheDocument();
    expect(tmobile.getByText('$19.99')).toBeInTheDocument();
    expect(tmobile.getByText('$24.99')).toBeInTheDocument();
    expect(tmobile.getByText('Carrier unlock +20% +$0.50, up to 5 cents')).toBeInTheDocument();
    // A proposal with no cost has no new price: the table shows a dash.
    const vodafone = await rowOf(CHANGES, 'Vodafone UK iPhone Unlock');
    expect(vodafone.getByText('The service has no cost now.')).toBeInTheDocument();
    expect(vodafone.getByText('–')).toBeInTheDocument();
  });

  it('shows every change in the All view, kept in the address, with a badge for each kind', async () => {
    const user = userEvent.setup();
    const app = await openChanges();
    await user.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(async () => expect((await tableNamed(CHANGES)).getAllByRole('row')).toHaveLength(8));
    expect(app.location()).toBe('/storefront?tab=pricing&show=all');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    const table = await tableNamed(CHANGES);
    expect(table.getAllByText('Waiting for approval')).toHaveLength(3);
    for (const word of ['Followed the cost', 'Rule changed', 'Floor changed', 'Stopped following']) {
      expect(table.getByText(word)).toBeInTheDocument();
    }
    expect(table.getByText('The price was changed outside the rule.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Waiting' }));
    await waitFor(async () => expect((await tableNamed(CHANGES)).getAllByRole('row')).toHaveLength(4));
    expect(app.location()).toBe('/storefront?tab=pricing');
  });

  it('asks the server for the waiting proposals, newest first, 25 to a page', async () => {
    const requests = recordRequests();
    await openChanges();
    const asked = requests
      .sent()
      .filter((sent) => sent.url.pathname.endsWith('/admin/retail-price-changes'))
      .map((sent) => Object.fromEntries(sent.url.searchParams));
    expect(asked).toContainEqual({ _start: '0', _end: '25', _sort: 'id', _order: 'desc', waiting: 'true' });
  });

  it('opens on the All view from an address with show=all and then asks for every change', async () => {
    const requests = recordRequests();
    await openChanges('/storefront?tab=pricing&show=all');
    const asked = requests
      .sent()
      .filter((sent) => sent.url.pathname.endsWith('/admin/retail-price-changes'))
      .map((sent) => Object.fromEntries(sent.url.searchParams));
    expect(asked).toContainEqual({ _start: '0', _end: '25', _sort: 'id', _order: 'desc' });
  });

  it('says nothing waits, with a way to the full list, and says when there is no change at all', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/retail-price-changes', () =>
        HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openStorefront(PRICING);
    expect(await screen.findByText('Nothing is waiting for you')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show every change' }));
    expect(await screen.findByText('No price changes yet')).toBeInTheDocument();
  });

  it('shows the server’s error with Retry', async () => {
    mockServer.use(
      http.get('*/admin/retail-price-changes', () => problem(500, 'INTERNAL', 'Server error', 'No answer.')),
    );
    await openStorefront(PRICING);
    expect(await screen.findByText('Could not load the price changes')).toBeInTheDocument();
  });
});

describe('the chip on the tab', () => {
  it('counts the proposals that wait from the server’s total and drops once none waits', async () => {
    const user = userEvent.setup();
    await openChanges();
    await waitFor(() => expect(tabTexts()[2]).toBe('Retail pricing3'));
    for (const service of ['T-Mobile USA Unlock', 'Vodafone UK iPhone Unlock', 'Orange France Unlock']) {
      await tick(user, service);
    }
    await user.click(screen.getByRole('button', { name: 'Keep the current price' }));
    await waitFor(() => expect(tabTexts()[2]).toBe('Retail pricing'));
    expect(await screen.findByText('Nothing is waiting for you')).toBeInTheDocument();
  });
});

describe('approving and keeping proposals', () => {
  it('applies the ticked proposals with the ids sent, and the listing shows the new price following the rule', async () => {
    const user = userEvent.setup();
    await openChanges();
    const requests = recordRequests();
    await tick(user, 'T-Mobile USA Unlock');
    const bar = within(screen.getByRole('region', { name: 'Selected price changes' }));
    expect(bar.getByText('1 selected')).toBeInTheDocument();
    await user.click(bar.getByRole('button', { name: 'Apply the new price' }));
    expect(await screen.findByText('Price changes resolved')).toBeInTheDocument();
    expect(screen.getByText('1 applied')).toBeInTheDocument();
    expect(lastWrite(requests, 'POST').body).toEqual({ ids: [7], action: 'apply' });
    expect(lastWrite(requests, 'POST').url.pathname).toBe('/admin/retail-price-changes/resolve');
    // The proposal left the waiting list and the bar is gone.
    await waitFor(async () => expect((await tableNamed(CHANGES)).getAllByRole('row')).toHaveLength(3));
    expect(screen.queryByRole('region', { name: 'Selected price changes' })).not.toBeInTheDocument();
    expect(tabTexts()[2]).toBe('Retail pricing2');
  });

  it('lists the ids the server skipped, in its words, and leaves them waiting', async () => {
    const user = userEvent.setup();
    await openChanges();
    await tick(user, 'Orange France Unlock');
    await tick(user, 'Vodafone UK iPhone Unlock');
    await user.click(screen.getByRole('button', { name: 'Apply the new price' }));
    const note = within(await screen.findByRole('status', { name: 'Skipped price changes' }));
    expect(note.getByText('2 changes were skipped:')).toBeInTheDocument();
    expect(
      note.getByText(
        'Orange France Unlock: the price moved, so the new figure is shown and needs your approval again.',
      ),
    ).toBeInTheDocument();
    expect(
      note.getByText('Vodafone UK iPhone Unlock: the service has no cost, so a rule cannot price it.'),
    ).toBeInTheDocument();
    // The proposal that moved now shows the new price, and is still waiting.
    const orange = await rowOf(CHANGES, 'Orange France Unlock');
    expect(await orange.findByText('$28.49')).toBeInTheDocument();
    expect((await tableNamed(CHANGES)).getAllByRole('row')).toHaveLength(4);
  });

  it('keeps the current price of the ticked proposals', async () => {
    const user = userEvent.setup();
    await openChanges();
    const requests = recordRequests();
    await tick(user, 'T-Mobile USA Unlock');
    await tick(user, 'Orange France Unlock');
    await user.click(screen.getByRole('button', { name: 'Keep the current price' }));
    expect(await screen.findByText('2 kept')).toBeInTheDocument();
    expect(lastWrite(requests, 'POST').body).toEqual({ ids: [7, 5], action: 'keep' });
    await waitFor(async () => expect((await tableNamed(CHANGES)).getAllByRole('row')).toHaveLength(2));
  });

  it('clears the ticks with Clear and when the view changes', async () => {
    const user = userEvent.setup();
    await openChanges();
    await tick(user, 'T-Mobile USA Unlock');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Selected price changes' })).not.toBeInTheDocument();
    await tick(user, 'T-Mobile USA Unlock');
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.queryByRole('region', { name: 'Selected price changes' })).not.toBeInTheDocument();
  });

  it('skips a change that was already resolved when it is ticked in the All view', async () => {
    const user = userEvent.setup();
    await openChanges('/storefront?tab=pricing&show=all');
    await waitFor(async () => expect((await tableNamed(CHANGES)).getAllByRole('row')).toHaveLength(8));
    const requests = recordRequests();
    await user.click((await rowOf(CHANGES, 'Samsung KG Lock Fix')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Apply the new price' }));
    expect(await screen.findByText('1 change was skipped:')).toBeInTheDocument();
    expect(screen.getByText(/it was already resolved/)).toBeInTheDocument();
    expect(lastWrite(requests, 'POST').body).toEqual({ ids: [1], action: 'apply' });
  });

  it('shows the server’s refusal as a toast and keeps the ticks', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/retail-price-changes/resolve', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You may not resolve price changes.'),
      ),
    );
    await openChanges();
    await tick(user, 'T-Mobile USA Unlock');
    await user.click(screen.getByRole('button', { name: 'Apply the new price' }));
    expect(await screen.findByText(/You may not resolve price changes\./)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Selected price changes' })).toBeInTheDocument();
  });
});

describe('the permissions of the price changes', () => {
  it('lets pricing:read see and tick them but asks pricing:update for the buttons', async () => {
    const user = userEvent.setup();
    await openChanges(PRICING, { permissions: ['pricing:read'] });
    await tick(user, 'T-Mobile USA Unlock');
    for (const name of ['Apply the new price', 'Keep the current price']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the pricing:update permission');
    }
  });

  it('enables them with pricing:update', async () => {
    const user = userEvent.setup();
    await openChanges(PRICING, { permissions: ['pricing:read', 'pricing:update'] });
    await tick(user, 'T-Mobile USA Unlock');
    expect(screen.getByRole('button', { name: 'Apply the new price' })).toBeEnabled();
  });
});
