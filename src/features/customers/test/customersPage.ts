// Helpers shared by the customers page tests: open the list or one customer signed in (as the Owner, or as a staff member with fewer
// permissions) and find tables, rows, tabs and dialogs by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and makes `me` say these permissions, before the page loads. */
async function signIn(permissions?: string[]): Promise<void> {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
}

/** Opens a route of the Customers list and waits for its heading. */
export async function openCustomers(route = '/customers', options: { permissions?: string[] } = {}) {
  await signIn(options.permissions);
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Customers' }, { timeout: 10_000 });
  return app;
}

/** Opens one customer's page (`/customers/<id>`, optionally `?tab=`) and waits for the customer's name in the heading. */
export async function openCustomer(
  id: number | string,
  name: string | RegExp,
  options: { tab?: string; permissions?: string[] } = {},
) {
  await signIn(options.permissions);
  const app = renderApp(`/customers/${id}${options.tab ? `?tab=${options.tab}` : ''}`);
  await screen.findByRole('heading', { level: 1, name }, { timeout: 10_000 });
  return app;
}

/** The Customers table, once it has loaded. */
export async function customersTable() {
  return within(await screen.findByRole('table', { name: 'Customers' }));
}

/** The row of the Customers table that holds some text (a name, an email). Dialogs and toasts are not searched. */
export async function customerRow(text: string) {
  const row = (await (await customersTable()).findByText(text)).closest('tr');
  if (!row) throw new Error(`No customer row holds "${text}".`);
  return within(row);
}

/** The Data requests table, once it has loaded. */
export async function requestsTable() {
  return within(await screen.findByRole('table', { name: 'Data requests' }));
}

/** The row of the Data requests table that holds some text (a request number, a customer). */
export async function requestRow(text: string) {
  const row = (await (await requestsTable()).findByText(text)).closest('tr');
  if (!row) throw new Error(`No request row holds "${text}".`);
  return within(row);
}

/** The tab strip of the list. */
export const listTabs = () => within(screen.getByRole('tablist', { name: 'Customer filter' }));

/** The tab strip of the customer page. */
export const detailTabs = () => within(screen.getByRole('tablist', { name: 'Customer details' }));

/** The text of every list tab with its count, such as "All30". */
export const tabTexts = () =>
  listTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** The names of the customers in the table, top to bottom. */
export async function customerNames(): Promise<string[]> {
  const table = await customersTable();
  return table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('link')[0]?.textContent ?? '');
}
