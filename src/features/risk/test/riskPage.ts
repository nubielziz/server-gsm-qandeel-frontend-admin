// Helpers shared by the risk page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions)
// and find the tabs, cards, tables and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the risk page; `permissions` changes what `me` says before the page loads. */
export async function openRisk(route = '/risk', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Risk & checks' }, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const riskTabs = () => within(screen.getByRole('tablist', { name: 'Risk sections' }));

/** The text of every tab with its count, such as "Review queue4". */
export const tabTexts = () =>
  riskTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** The card of a held order, such as `heldCard('SF-20490')`. */
export const heldCard = (label: string) =>
  within(screen.getByRole('article', { name: `Held order ${label}` }));

/** A table with this accessible name, once it has loaded. */
export async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text. Drawers, dialogs and toasts are not searched. */
export async function rowOf(table: string, text: string) {
  const row = (await (await tableNamed(table)).findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${text}".`);
  return within(row);
}

/** The open dialog (a native dialog with this name). */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));
