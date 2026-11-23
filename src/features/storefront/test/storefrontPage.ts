// Helpers shared by the Shop content page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions)
// and find the tab strip, tables, rows and dialogs by their accessible names. `openCatalogView` opens the listings, publish and retail
// pricing components at the Catalog's addresses through a stand-in, since those parts are no longer tabs of the page. Import them from
// tests only.
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { createElement } from 'react';
import { Route } from 'react-router';
import { mockMe, renderApp, renderShell, signInAs } from '@/test/renderApp';
import { CatalogStandIn } from './CatalogStandIn';

/** Signs in as Rami (the Owner), or as a staff member with fewer permissions (what `me` says before the page loads). */
async function signIn(options: { permissions?: string[] }) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
}

/** Signs in as Rami (the Owner) and opens a route of the Shop content page; `permissions` changes what `me` says before the page loads. */
export async function openStorefront(route = '/storefront', options: { permissions?: string[] } = {}) {
  await signIn(options);
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Shop content' }, { timeout: 10_000 });
  return app;
}

/**
 * Signs in and mounts the listings, publish or retail pricing component the Catalog address names inside the shell, with the real
 * providers: `/catalog?view=publish&run=8`, `/catalog?view=settings&tab=shop-prices`, or `/catalog` for the listings. The caller waits
 * for what it needs to see.
 */
export async function openCatalogView(route: string, options: { permissions?: string[] } = {}) {
  await signIn(options);
  const app = renderShell(
    route,
    createElement(Route, { path: '/catalog', element: createElement(CatalogStandIn) }),
  );
  // As the page tests wait for the page's heading, this waits (longer than a query would) for the shell and the view to be there.
  await screen.findByTestId('catalog-view', {}, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const pageTabs = () => within(screen.getByRole('tablist', { name: 'Shop content sections' }));

/** The text of every tab, such as "Landing pages". */
export const tabTexts = () =>
  pageTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** The text of the stand-in's settings tab, with its chip when it has one, such as "Retail pricing3". */
export const settingsTabTexts = () =>
  within(screen.getByRole('tablist', { name: 'Catalog settings sections' }))
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
