// Helpers shared by the refunds views' tests: open the Money page on one of the views signed in (as the Owner, or as a staff member
// with fewer permissions) and find the tables, rows and dialogs by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** The addresses of the three views (what `refundsPath` gives with no filters, written out so a wrong link shows in a test). */
export const REFUNDS_VIEW = '/money?view=refunds';
export const DISPUTES_VIEW = '/money?view=disputes';
export const SHOP_PAYMENTS_VIEW = '/money?view=shop-payments';

/** Signs in as Rami (the Owner) and opens a route of the Money page; `permissions` changes what `me` says before the page loads. */
export async function openRefunds(route = REFUNDS_VIEW, options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Money' }, { timeout: 10_000 });
  return app;
}

/** A table by its accessible name, once it has loaded. */
export async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text (an id, a name). Dialogs and toasts are not searched. */
export async function rowWith(tableName: string, text: string | RegExp) {
  const row = (await (await tableNamed(tableName)).findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${tableName}" holds "${String(text)}".`);
  return within(row);
}

/** The dialog (a native dialog with this name), once it has opened. */
export async function dialogNamed(name: string | RegExp) {
  return within(await screen.findByRole('dialog', { name }));
}
