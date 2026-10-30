// Helpers shared by the merchants page tests: open the list or one merchant signed in (as the Owner, or as a staff member with
// fewer permissions) and find tables, rows and tabs by their accessible names. Import them from tests only.
import { configure, screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

// The shared machine can be slow while the whole suite runs, and every `findBy…` here waits for a mock API answer and a render, so
// give them more than the default second. A passing test does not wait longer; only a failing one takes longer to fail.
configure({ asyncUtilTimeout: 5_000 });

type Options = { permissions?: string[] };

// Signs in as Rami (the Owner); `permissions` changes what `me` says before the page loads.
async function signIn({ permissions }: Options) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
}

/** Opens a route of the merchants list and waits for its heading. */
export async function openMerchants(route = '/merchants', options: Options = {}) {
  await signIn(options);
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Merchants' }, { timeout: 10_000 });
  return app;
}

/** Opens one merchant's page (`/merchants/<id>` plus a query such as `?tab=wallet`) and waits for the merchant's name as the heading. */
export async function openMerchant(
  id: number | string,
  name: string | RegExp,
  query = '',
  options: Options = {},
) {
  await signIn(options);
  const app = renderApp(`/merchants/${id}${query}`);
  await screen.findByRole('heading', { level: 1, name }, { timeout: 10_000 });
  return app;
}

/** The table with this accessible name, once it has loaded. */
export async function tableNamed(name: string) {
  return within(await screen.findByRole('table', { name }));
}

/** The row of a table that holds some text (a name, an amount; the first one when several cells say it). Drawers, dialogs and toasts are not searched. */
export async function rowOf(table: string, text: string | RegExp) {
  const [match] = await (await tableNamed(table)).findAllByText(text);
  const row = match?.closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${String(text)}".`);
  return within(row);
}

/** The tab strip of the merchants list. */
export const statusTabs = () => within(screen.getByRole('tablist', { name: 'Merchant status' }));

/** The text of every tab of the list with its count, such as "Active17". */
export const tabTexts = () =>
  statusTabs()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

/** The tab strip of a merchant's page. */
export const sectionTabs = () => within(screen.getByRole('tablist', { name: 'Merchant sections' }));

/** The open dialog or drawer (a native dialog) with this name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));
