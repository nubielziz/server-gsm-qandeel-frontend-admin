// Tests for the Orders part of an account's record, run through the whole app against the dev mock API: the orders feature's table filtered to
// the account without its Buyer column, the order drawer kept in the address, what an empty list says by the account's state, and what a role
// without `orders:read` is never asked for, and the IMEIs cut short after an account is anonymized. Ports the Orders cases of the old
// customer and merchant pages.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount, renderAccounts } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const DANIEL = /Daniel Whitmore/; // 101: a retail login, 4 orders
const ZAIN = /Zain Mobile Hub/; // 1: a VIP merchant with orders

// Records the address of every read of the orders list and lets the mock answer it.
function watchOrders(): string[] {
  const seen: string[] = [];
  mockServer.use(
    http.get('*/admin/orders', ({ request }) => {
      seen.push(request.url);
      return undefined;
    }),
  );
  return seen;
}

describe('the orders of an account', () => {
  it('lists a retail account’s orders without a Buyer column, and opens an order’s drawer in the address', async () => {
    const user = userEvent.setup();
    const app = await renderAccount(SEED.DANIEL, DANIEL, { tab: 'orders' });
    const table = within(await screen.findByRole('table', { name: 'Orders of Daniel Whitmore' }));
    expect(await table.findByText('SF-20485')).toBeInTheDocument();
    expect(table.getByText('SF-20466')).toBeInTheDocument();
    expect(table.queryByRole('columnheader', { name: 'Buyer' })).not.toBeInTheDocument();
    expect(table.getAllByRole('row')).toHaveLength(5);

    await user.click(table.getByText('SF-20485'));
    expect(app.location()).toBe('/accounts/101?tab=orders&order=20485');
    expect(await screen.findByRole('dialog', { name: 'SF-20485' })).toBeInTheDocument();
  });

  it('lists a merchant’s orders the same way, with their service column', async () => {
    const user = userEvent.setup();
    const app = await renderAccount(SEED.ZAIN, ZAIN, { tab: 'orders' });
    const table = within(await screen.findByRole('table', { name: 'Orders of Zain Mobile Hub' }));
    await waitFor(() => expect(table.getAllByRole('row').length).toBeGreaterThan(1));
    expect(table.queryByRole('columnheader', { name: /Buyer/ })).not.toBeInTheDocument();
    expect(table.getByRole('columnheader', { name: /Service/ })).toBeInTheDocument();
    await user.click(table.getAllByRole('button', { name: /^ORD-\d+$/ })[0]);
    expect(app.location()).toMatch(/^\/accounts\/1\?tab=orders&order=\d+$/);
    expect(await screen.findByRole('dialog', { name: /^(Order \d+|ORD-\d+)$/ })).toBeInTheDocument();
  });

  it('asks the server for this account’s orders only, ten to a page', async () => {
    const seen = watchOrders();
    await renderAccount(SEED.DANIEL, DANIEL, { tab: 'orders' });
    await screen.findByRole('table', { name: 'Orders of Daniel Whitmore' });
    expect(seen.length).toBeGreaterThan(0);
    for (const url of seen) {
      const params = new URL(url).searchParams;
      expect(params.get('accountId')).toBe('101');
      expect(params.has('clientId')).toBe(false);
      expect(params.has('customerId')).toBe(false);
      expect(params.get('_start')).toBe('0');
      expect(params.get('_end')).toBe('10');
    }
  });

  it('opens Orders with the drawer for an address that names an order and no part', async () => {
    await renderAccounts('/accounts/101?order=20485');
    expect(await screen.findByRole('dialog', { name: 'SF-20485' })).toBeInTheDocument();
    const current = partsMenu()
      .getAllByRole('link')
      .find((link) => link.getAttribute('aria-current') === 'page');
    expect(current?.textContent).toMatch(/^Orders/);
  });
});

describe('an empty list', () => {
  it('tells an active account that orders show here as soon as it places one', async () => {
    await renderAccount(SEED.INVITED, /Algiers Service Plus/, { tab: 'orders' });
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Orders show here as soon as they place one.')).toBeInTheDocument();
  });

  it('says a suspended account cannot order while it is suspended', async () => {
    await renderAccount(SEED.FORMER_PENDING, /Accra Devices/, { tab: 'orders' });
    expect(await screen.findByText('No orders')).toBeInTheDocument();
    expect(screen.getByText('This account cannot order while it is suspended.')).toBeInTheDocument();
  });

  it('says only "No orders" for a guest who has not ordered', async () => {
    await renderAccount(SEED.SOFIA, /Sofia Alvarez/, { tab: 'orders' });
    expect(await screen.findByText('No orders')).toBeInTheDocument();
    expect(screen.queryByText('No orders yet')).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot order/)).not.toBeInTheDocument();
  });
});

describe('an anonymized account', () => {
  it('shows the IMEIs of its orders cut short once the account is anonymized, and the orders stay', async () => {
    const user = userEvent.setup();
    await renderAccount(SEED.DANIEL, DANIEL, { tab: 'orders' });
    const before = within(await screen.findByRole('table', { name: 'Orders of Daniel Whitmore' }));
    expect(await before.findByText('SF-20485')).toBeInTheDocument();
    // Whole IMEIs are grouped as "35 123456 789012 3"; none is cut yet.
    expect(before.getAllByText(/^\d{2} \d{6} \d{6} \d$/).length).toBeGreaterThan(0);
    expect(before.queryByText(/•••••••/)).not.toBeInTheDocument();

    await user.click(partsMenu().getByRole('link', { name: /^Privacy and risk/ }));
    await user.click(await screen.findByRole('button', { name: 'Anonymize…' }));
    const dialog = await screen.findByRole('dialog', { name: 'Anonymize Daniel Whitmore?' });
    await user.click(within(dialog).getByRole('button', { name: 'Anonymize' }));
    expect(await screen.findByText('Account anonymized')).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Deleted account' });

    await user.click(partsMenu().getByRole('link', { name: /^Orders/ }));
    const after = within(await screen.findByRole('table', { name: 'Orders of Deleted account' }));
    expect(await after.findByText('SF-20485')).toBeInTheDocument();
    expect(after.getAllByRole('row')).toHaveLength(5);
    // Every order keeps its row and its number; the IMEI of each is cut after its first eight digits.
    expect(after.getAllByText(/^\d{8}•••••••$/)).toHaveLength(4);
    expect(after.queryByText(/^\d{2} \d{6} \d{6} \d$/)).not.toBeInTheDocument();
  });
});

describe('a role that may not read orders', () => {
  it('is never asked for them: the address naming Orders shows Overview and the part is left out of the menu', async () => {
    const seen = watchOrders();
    await renderAccount(SEED.DANIEL, DANIEL, { tab: 'orders', permissions: ['clients:read'] });
    const links = partsMenu()
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toContain('Overview');
    expect(links.some((text) => text?.startsWith('Orders'))).toBe(false);
    expect(screen.queryByRole('table', { name: /^Orders of/ })).not.toBeInTheDocument();
    expect(seen).toEqual([]);
  });
});
