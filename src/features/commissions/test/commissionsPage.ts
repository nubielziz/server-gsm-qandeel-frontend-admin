// Helpers shared by the commissions page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions) and
// find the tab strip, tables and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';
import { approveAccruals, listAccruals } from '../api';

/**
 * Signs in as Rami (the Owner) and opens a route of the Commissions page; `permissions` changes what `me` says before the page
 * loads, and `prepare` runs once the session exists and before the page opens (to change the mock data through the API).
 */
export async function openCommissions(
  route = '/commissions',
  options: { permissions?: string[]; prepare?: () => Promise<unknown> } = {},
) {
  await signInAs();
  await options.prepare?.();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Commissions' }, { timeout: 10_000 });
  return app;
}

/** The tab strip of the page. */
export const pageTabs = () => within(screen.getByRole('tablist', { name: 'Commission sections' }));

/** The text of every tab, with its count when it has one, such as "Accruals49". */
export const tabTexts = () =>
  pageTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** Opens a tab by its name and waits for its panel. */
export async function openTab(user: UserEvent, name: string) {
  await user.click(pageTabs().getByRole('tab', { name: new RegExp(`^${name}`) }));
  return within(await screen.findByRole('tabpanel', { name }));
}

/** A table by its accessible name, once it has loaded. */
export async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text. Dialogs and toasts are not searched. */
export async function rowOf(tableName: string, text: string | RegExp) {
  const table = await tableNamed(tableName);
  const row = (await table.findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${tableName}" holds "${String(text)}".`);
  return within(row);
}

/** The accruals table, once it has loaded. */
export const accrualsTable = () => tableNamed('Commission accruals');

/** The data rows of a table (the header row left out). */
export function dataRows(table: { getAllByRole: (role: string) => HTMLElement[] }): HTMLElement[] {
  return table.getAllByRole('row').slice(1);
}

/** An open dialog by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** Approves every ready accrual through the API, so the page opens with nothing waiting. Needs a signed-in session. */
export async function approveAllReady() {
  const ready = await listAccruals({ filters: { status: 'accrued' } });
  return approveAccruals({ ids: ready.data.map((accrual) => accrual.id) });
}
