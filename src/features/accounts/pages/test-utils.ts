// Helpers shared by the Accounts page tests: open the page or one account signed in (as the Owner, or as a staff member with fewer permissions)
// and find the strip, the row of links, the tables, rows and dialogs by their accessible names, or draw one piece of the page on its own inside
// the app's providers. Import them from tests only; the test file calls `setupMockApi()` and `installAccountMocks()` (the data layer's mock
// installer) at its top.
import { render, screen, within } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/App';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';
import { ACCOUNT_TEST_ROLES, type AccountTestRole } from '../test/roles';

/** What a test may choose about the staff member: one of the five roles (default the Owner), or its own list of permissions. */
export type RenderOptions = { role?: AccountTestRole; permissions?: readonly string[] };

/** The permissions of the roles, for tests that build their own. */
export const ROLES = ACCOUNT_TEST_ROLES;

/** Signs in as Rami and makes `me` say the permissions of the role, before the page loads. */
async function signInWith(options: RenderOptions): Promise<void> {
  await signInAs();
  const permissions = options.permissions ?? ACCOUNT_TEST_ROLES[options.role ?? 'owner'];
  mockMe({ id: 1, name: 'Rami K.', permissions: [...permissions] });
}

/** Opens an address of the Accounts page and waits for the heading "Accounts". */
export async function renderAccounts(address = '/accounts', options: RenderOptions = {}) {
  await signInWith(options);
  const app = renderApp(address);
  await screen.findByRole('heading', { level: 1, name: 'Accounts' }, { timeout: 10_000 });
  return app;
}

/** Opens one account (`/accounts/<id>`, optionally `?tab=`) and waits for its name in the left menu's title. */
export async function renderAccount(
  id: number | string,
  name: string | RegExp,
  options: RenderOptions & { tab?: string } = {},
) {
  await signInWith(options);
  const app = renderApp(`/accounts/${id}${options.tab ? `?tab=${options.tab}` : ''}`);
  await screen.findByRole('heading', { level: 2, name }, { timeout: 10_000 });
  return app;
}

/**
 * Draws one piece of the page on its own (the dialog host, an account's record) inside the app's providers and a router at `route`, signed
 * in first, so the real parts and dialogs it holds read and write against the mock API. `rerender` keeps the providers.
 */
export async function renderInApp(ui: ReactElement, options: RenderOptions & { route?: string } = {}) {
  await signInWith(options);
  const route = options.route ?? '/accounts';
  function Providers({ children }: { children: ReactNode }) {
    return createElement(
      MemoryRouter,
      { initialEntries: [route] },
      createElement(AppProviders, null, children),
    );
  }
  return render(ui, { wrapper: Providers });
}

/** The strip of populations, once the page has drawn it. */
export async function stripTabs() {
  return within(await screen.findByRole('navigation', { name: 'Accounts shown' }, { timeout: 10_000 }));
}

/** The row of views, once the page has drawn it. */
export async function viewLinks() {
  return within(await screen.findByRole('navigation', { name: 'Views' }, { timeout: 10_000 }));
}

// What the helpers below need of a row of links: `within(...)` of a navigation has it.
type Row = { getAllByRole: (role: 'link') => HTMLElement[] };

/** The text of every link of a row, such as "+Add Account" (the plus is drawn before the label). */
export const linkTexts = (row: Row) => row.getAllByRole('link').map((link) => link.textContent);

/** The text of the link a row marks as the current one, or undefined when it marks none. */
export const currentLink = (row: Row) =>
  row.getAllByRole('link').find((link) => link.getAttribute('aria-current') === 'page')?.textContent;

/** The table of the All view, once it has loaded. */
export const accountsTable = () => screen.findByRole('table', { name: 'Accounts' }, { timeout: 10_000 });

/** The row of the table that holds some text (a name, an email). Dialogs and toasts are not searched. */
export async function accountRow(text: string) {
  const row = within(await accountsTable())
    .getByText(text)
    .closest('tr');
  if (!row) throw new Error(`No account row holds "${text}".`);
  return within(row);
}

/** The names of the accounts in the table, top to bottom (the first link of each row). */
export async function accountNames(): Promise<string[]> {
  const table = within(await accountsTable());
  return table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('link')[0]?.textContent ?? '');
}

/** An open dialog by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** The left menu of the parts of one account. */
export const partsMenu = () => within(screen.getByRole('navigation', { name: 'Parts of the account' }));
