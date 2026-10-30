// Helpers shared by the services page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions) and
// find the tab strip, tables and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the services page; `permissions` changes what `me` says before the page loads. */
export async function openServices(route = '/services', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Services & pricing' }, { timeout: 10_000 });
  return app;
}

/** The Services table, once it has loaded. */
export async function servicesTable() {
  return within(await screen.findByRole('table', { name: 'Services' }));
}

/** The row of the Services table that holds some text (a service name or code). Dialogs and toasts are not searched. */
export async function serviceRow(text: string) {
  const row = (await (await servicesTable()).findByText(text)).closest('tr');
  if (!row) throw new Error(`No service row holds "${text}".`);
  return within(row);
}

/** The tab strip of the page. */
export const pageTabs = () => within(screen.getByRole('tablist', { name: 'Pricing sections' }));

/** The text of every tab, with its count when it has one, such as "Services27". */
export const tabTexts = () =>
  pageTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** Opens a tab by its name and waits for its panel. */
export async function openTab(user: UserEvent, name: string) {
  await user.click(pageTabs().getByRole('tab', { name: new RegExp(`^${name}`) }));
  return within(await screen.findByRole('tabpanel', { name }));
}

/** An open dialog by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** Opens the "⋯" menu of a service row and picks an item. */
export async function pickFromRowMenu(user: UserEvent, serviceName: string, item: string) {
  await user.click(await screen.findByRole('button', { name: `Actions for ${serviceName}` }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}
