// Helpers shared by the finance view tests: open the Money page signed in (as the Owner, or as a staff member with fewer permissions) and
// find the links of its rows, tables and table rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/**
 * Signs in as Rami (the Owner) and opens a route of the Money page (`/money?view=deposits`); `permissions` changes what `me` says before
 * it loads. The default route is the Ledger view, the first view of the Books.
 */
export async function openFinance(route = '/money?view=ledger', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Money' }, { timeout: 10_000 });
  return app;
}

/** A link of the page's two rows (a tab of the strip or a view) by its words with its count, such as "Deposits (7)". */
export const moneyLink = (name: string | RegExp) => screen.findByRole('link', { name });

/** A table of the page by its name, once it has loaded. */
export async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text. */
export async function rowWith(tableName: string, text: string | RegExp) {
  const row = (await (await tableNamed(tableName)).findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${tableName}" holds "${String(text)}".`);
  return within(row);
}

/** The key figures of the Overview. */
export const strip = () => within(screen.getByRole('region', { name: 'Key figures' }));
