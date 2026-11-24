// OrdersTable: the list another page embeds. The Accounts page fixes it to one account (`fixed={{ accountId }}`): it is rendered inside the
// real app shell against the dev mock API, in a small route of its own, the way a record page would use it.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { OrderDrawerHost } from './OrderDrawerHost';
import { OrdersTable } from './OrdersTable';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Orders of the mock seed: ORD-48859 is Muscat Mobile Clinic's (account 13).
async function show(fixed: Parameters<typeof OrdersTable>[0]['fixed'], hideBuyer = false) {
  await signInAs();
  return renderShell(
    '/probe',
    <Route
      path="/probe"
      element={
        <>
          <OrdersTable fixed={fixed} hideBuyer={hideBuyer} caption="Account orders" />
          <OrderDrawerHost />
        </>
      }
    />,
  );
}

const table = async () =>
  within(await screen.findByRole('table', { name: 'Account orders' }, { timeout: 10_000 }));

describe('OrdersTable fixed to an account', () => {
  it('lists only the orders of that account, each with its rank under the name', async () => {
    await show({ accountId: 13 });
    const rows = await table();
    expect(await rows.findByText('ORD-48859')).toBeInTheDocument();
    const buyers = rows.getAllByText('Muscat Mobile Clinic');
    expect(buyers.length).toBeGreaterThan(0);
    // Every row of the table is that one account, so none names another buyer.
    const bodyRows = rows.getAllByRole('row').slice(1);
    expect(bodyRows.every((row) => within(row).queryByText('Muscat Mobile Clinic') !== null)).toBe(true);
  });

  it('sends accountId, and never clientId or customerId', async () => {
    const seen: URLSearchParams[] = [];
    mockServer.use(
      http.get('*/admin/orders', ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json([], { headers: { 'x-total-count': '0' } });
      }),
    );
    await show({ accountId: 111 });
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0].get('accountId')).toBe('111');
    expect(seen[0].has('clientId')).toBe(false);
    expect(seen[0].has('customerId')).toBe(false);
  });

  it('leaves out the Buyer column when every row has the same buyer', async () => {
    await show({ accountId: 13 }, true);
    const rows = await table();
    await rows.findByText('ORD-48859');
    expect(screen.queryByRole('columnheader', { name: 'Buyer' })).not.toBeInTheDocument();
  });

  it('opens an order in the drawer, which names the account behind it', async () => {
    const user = userEvent.setup();
    const app = await show({ accountId: 13 });
    const rows = await table();
    await user.click(await rows.findByText('ORD-48859'));
    expect(app.location()).toContain('order=48859');
    const drawer = within(await screen.findByRole('dialog', { name: 'ORD-48859' }));
    expect(await drawer.findByRole('link', { name: 'Muscat Mobile Clinic' })).toHaveAttribute(
      'href',
      '/accounts/13',
    );
  });
});
