// Helpers shared by the orders page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions)
// and find tables, rows and tabs by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { renderApp, mockMe, signInAs } from './renderApp';

/** Signs in as Rami (the Owner) and opens a route of the orders page; `permissions` changes what `me` says before the page loads. */
export async function openOrders(route = '/orders', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Orders' }, { timeout: 10_000 });
  return app;
}

/** The Orders table, once it has loaded. */
export async function ordersTable() {
  return within(await screen.findByRole('table', { name: 'Orders' }));
}

/** The row of the Orders table that holds some text (an order number, a buyer). Drawers, dialogs and toasts are not searched. */
export async function orderRow(text: string) {
  const row = (await (await ordersTable()).findByText(text)).closest('tr');
  if (!row) throw new Error(`No order row holds "${text}".`);
  return within(row);
}

/** The tab strip of the page. */
export const statusTabs = () => within(screen.getByRole('tablist', { name: 'Order status' }));

/** The text of every tab with its count, such as "Open48". */
export const tabTexts = () =>
  statusTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** The open order drawer (a native dialog with the order's number as its name). */
export const drawerOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));
