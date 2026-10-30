// Helpers shared by the suppliers page tests: open the page signed in (as the Owner, or with fewer permissions) and find the list, the detail,
// the tables and the toasts. Tests install the feature's mocks themselves (`mockServer.use(...mocks.handlers)`): lint keeps MSW out of
// helper files. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the suppliers page; `permissions` changes what `me` says before it loads. */
export async function openSuppliers(route = '/suppliers', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Suppliers' }, { timeout: 10_000 });
  return app;
}

/** The supplier list on the left, once it has loaded. */
export async function supplierList() {
  return within(await screen.findByRole('list', { name: 'Suppliers' }));
}

/** The button of one supplier in the list. */
export async function supplierButton(name: string | RegExp) {
  return (await supplierList()).getByRole('button', { name });
}

/** The detail panel of a supplier, by its name. */
export async function detailOf(name: string) {
  return within(await screen.findByRole('region', { name: `${name} details` }, { timeout: 10_000 }));
}

/** The text of the four stats of the open detail, such as "Open orders17". */
export function statTexts(detail: ReturnType<typeof within>) {
  return ['Success, last hour', 'Latency p50 / p95', 'Open orders', 'Prepaid balance'].map(
    (label) => detail.getByText(label).parentElement?.textContent ?? '',
  );
}

/** The toasts on screen, so a message is not confused with the same words in a table or a dialog. */
export function toasts() {
  return within(document.getElementById('toasts') as HTMLElement);
}
