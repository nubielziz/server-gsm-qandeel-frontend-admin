// Helpers shared by the Catalog page tests (the services feature's page): open the page signed in (as the Owner, or as a staff member
// with fewer permissions) and find the settings tab strip, tables and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Where the app routes the Catalog page. Every address the tests open or expect is built from it. */
export const CATALOG_ROUTE = '/catalog';

/** A Catalog address with a query, such as `catalogRoute('view=settings&tab=rules')`; no query is the bare page (the table). */
export const catalogRoute = (query = '') => (query ? `${CATALOG_ROUTE}?${query}` : CATALOG_ROUTE);

/** The address of a settings tab, or of the settings on their first tab. */
export const settingsRoute = (tab?: string) =>
  catalogRoute(tab ? `view=settings&tab=${tab}` : 'view=settings');

/** Signs in as Rami (the Owner) and opens a Catalog address; `permissions` changes what `me` says before the page loads. */
export async function openServices(route = CATALOG_ROUTE, options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Catalog' }, { timeout: 10_000 });
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

/** The tab strip of the Catalog settings. */
export const settingsTabs = () => within(screen.getByRole('tablist', { name: 'Catalog settings sections' }));

/** The text of every settings tab, with its count when it has one, such as "Shop price rules3". */
export const tabTexts = () =>
  settingsTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** Opens a settings tab by its name and waits for its panel. */
export async function openTab(user: UserEvent, name: string) {
  await user.click(settingsTabs().getByRole('tab', { name: new RegExp(`^${name}`) }));
  return within(await screen.findByRole('tabpanel', { name }));
}

/** An open dialog by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** Opens the "⋯" menu of a service row and picks an item. */
export async function pickFromRowMenu(user: UserEvent, serviceName: string, item: string) {
  await user.click(await screen.findByRole('button', { name: `Actions for ${serviceName}` }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}
