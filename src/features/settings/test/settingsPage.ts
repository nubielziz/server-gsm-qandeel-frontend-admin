// Helpers shared by the settings page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions) and find
// the tab strip, tables, rows and dialogs by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the settings page; `permissions` changes what `me` says before the page loads. */
export async function openSettings(route = '/settings', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Settings' }, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const sectionTabs = () => within(screen.getByRole('tablist', { name: 'Settings sections' }));

/** The text of every tab, with its count when it has one, such as "Tax and currency1". */
export const tabTexts = () =>
  sectionTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** Opens a tab by its name and waits for its panel. */
export async function openTab(user: UserEvent, name: string) {
  await user.click(sectionTabs().getByRole('tab', { name: new RegExp(`^${name}`) }));
  return within(await screen.findByRole('tabpanel', { name }));
}

/** An open dialog (or drawer) by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** The row of a table that holds some text; dialogs and toasts are not searched. */
export async function rowOf(tableName: string, text: string | RegExp) {
  const table = within(await screen.findByRole('table', { name: tableName }));
  const row = (await table.findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${tableName}" holds "${String(text)}".`);
  return within(row);
}
