// Helpers shared by the Money page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions), or draw the page
// on its own inside the app's providers, and read the strip and the row of views. Import them from tests only.
import { render, screen, within } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/App';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** What `me` says about the staff member; the default is the Owner. */
export type MoneyRole = { permissions?: readonly string[] };

async function signInWith(role: MoneyRole): Promise<void> {
  await signInAs();
  mockMe({ id: 1, name: 'Rami K.', permissions: [...(role.permissions ?? ['*'])] });
}

/** Opens an address of the Money page and waits for the strip of tabs. */
export async function openMoney(address = '/money', role: MoneyRole = {}) {
  await signInWith(role);
  const app = renderApp(address);
  await stripTabs();
  return app;
}

/** Opens an address and waits for the heading only: for a page the role may not open, which draws no strip. */
export async function openMoneyHeading(address: string, role: MoneyRole) {
  await signInWith(role);
  const app = renderApp(address);
  await screen.findByRole('heading', { level: 1, name: 'Money' }, { timeout: 10_000 });
  return app;
}

/** Draws a piece of the app on its own inside the providers and a router at `route`, signed in first. */
export async function renderInApp(ui: ReactElement, role: MoneyRole = {}, route = '/money') {
  await signInWith(role);
  function Providers({ children }: { children: ReactNode }) {
    return createElement(
      MemoryRouter,
      { initialEntries: [route] },
      createElement(AppProviders, null, children),
    );
  }
  return render(ui, { wrapper: Providers });
}

/** The strip of tabs, once the page has drawn it. */
export async function stripTabs() {
  return within(await screen.findByRole('navigation', { name: 'Money sections' }, { timeout: 10_000 }));
}

/** The row of views, once the page has drawn it. */
export async function viewLinks() {
  return within(await screen.findByRole('navigation', { name: 'Views' }, { timeout: 10_000 }));
}

// What the helpers below need of a row of links: `within(...)` of a navigation has it.
type Row = { getAllByRole: (role: 'link') => HTMLElement[] };

/** The text of a link without the count a queue adds ("Money in (3)" is "Money in"), so a test holds whether or not something is waiting. */
export const withoutCount = (text: string | null) => (text ?? '').replace(/ \([\d,]+\)$/, '');

/** The text of every link of a row, counts left out ("+Issue invoice" keeps its plus). */
export const linkTexts = (row: Row) => row.getAllByRole('link').map((link) => withoutCount(link.textContent));

/** The text of the link a row marks as the current one (count left out), or undefined when it marks none. */
export const currentLink = (row: Row) =>
  withoutCount(
    row.getAllByRole('link').find((link) => link.getAttribute('aria-current') === 'page')?.textContent ??
      null,
  ) || undefined;
