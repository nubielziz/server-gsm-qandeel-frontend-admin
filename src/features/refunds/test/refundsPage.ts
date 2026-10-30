// Helpers shared by the refunds page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions)
// and find the tabs, tables and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the page; `permissions` changes what `me` says before the page loads. */
export async function openRefunds(route = '/refunds', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Refunds & disputes' }, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const sectionTabs = () => within(screen.getByRole('tablist', { name: 'Refund sections' }));

/** The text of every visible tab with its count chip, such as "Refunds4". */
export const tabTexts = () =>
  sectionTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

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
