// Helpers shared by the Product / Services page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions)
// and find its two rows of links and its views by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Where the app routes the page. Every address the tests open or expect is built from it. */
export const PRODUCTS_ROUTE = '/products';

/** Signs in as Rami (the Owner) and opens an address of the page; `permissions` changes what `me` says before the page loads. */
export async function openProducts(route = PRODUCTS_ROUTE, options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Product / Services' }, { timeout: 10_000 });
  return app;
}

/** The strip of kinds (IMEI Service, Server Service, …), once the page has drawn it. */
export async function kindStrip() {
  return within(await screen.findByRole('navigation', { name: 'Kind of service' }, { timeout: 10_000 }));
}

/** The row of views (All, Pricing, …), once the page has drawn it. */
export async function viewLinks() {
  return within(await screen.findByRole('navigation', { name: 'Views' }, { timeout: 10_000 }));
}

// What the helpers below need of a row of links: `within(...)` of a navigation has it.
type Row = { getAllByRole: (role: 'link') => HTMLElement[] };

/** The text of every link of a row, such as "+Add Service" (the plus is drawn before the label). */
export const linkTexts = (row: Row) => row.getAllByRole('link').map((link) => link.textContent);

/** The text of the link a row marks as the current one, or undefined when it marks none. */
export const currentLink = (row: Row) =>
  row.getAllByRole('link').find((link) => link.getAttribute('aria-current') === 'page')?.textContent;

/** An open dialog by its name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));

/** The table of the All view (the services of the kind), once it is drawn. */
export const servicesTable = () => screen.findByRole('table', { name: 'Services' }, { timeout: 10_000 });
