// Helpers shared by the Finance page tests: open the page signed in (as the Owner, or as a staff member with fewer
// permissions) and find tabs, tables and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the Finance page; `permissions` changes what `me` says before it loads. */
export async function openFinance(route = '/finance', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Finance' }, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const financeTabs = () => within(screen.getByRole('tablist', { name: 'Finance sections' }));

/** The text of every tab with its count, such as "Deposits6". */
export const tabTexts = () =>
  financeTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

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

/** The key figures under the title. */
export const strip = () => within(screen.getByRole('region', { name: 'Key figures' }));
