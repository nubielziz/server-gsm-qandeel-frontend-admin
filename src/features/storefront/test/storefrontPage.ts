// Helpers shared by the Storefront page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions)
// and find the tab strip, tables, rows and dialogs by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the Storefront page; `permissions` changes what `me` says before the page loads. */
export async function openStorefront(route = '/storefront', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Storefront' }, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const pageTabs = () => within(screen.getByRole('tablist', { name: 'Storefront sections' }));

/** The text of every tab, with its count when it has one, such as "Services on sale11". */
export const tabTexts = () =>
  pageTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** Opens a tab by its name and waits for its panel. */
export async function openTab(user: UserEvent, name: string) {
  await user.click(pageTabs().getByRole('tab', { name: new RegExp(`^${name}`) }));
  return within(await screen.findByRole('tabpanel', { name }));
}

/** A table by its caption, once it has loaded. */
export async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text. Dialogs and toasts are not searched. */
export async function rowOf(table: string, text: string) {
  const row = (await (await tableNamed(table)).findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${text}".`);
  return within(row);
}

/** An open dialog by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** Opens the "⋯" menu of a row (named "Actions for <name>") and picks an item. */
export async function pickFromRowMenu(user: UserEvent, rowName: string, item: string | RegExp) {
  await user.click(await screen.findByRole('button', { name: `Actions for ${rowName}` }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}
