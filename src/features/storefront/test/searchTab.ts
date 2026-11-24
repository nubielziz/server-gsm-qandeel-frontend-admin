// Helpers shared by the Search tab tests: open the tab signed in as the Owner (or as a role with fewer permissions), and the
// permission lists the tests use. Import them from tests only.
import { configure, screen } from '@testing-library/react';
import { openStorefront } from './storefrontPage';

// These tests open the whole app and load a page lazily; a busy machine needs more than the default second to find what it waits for.
configure({ asyncUtilTimeout: 5_000 });

/** A staff member who reads the storefront. */
export const READER = ['storefront:read'];

/**
 * Opens the Search tab by its address (`/storefront?tab=search` unless `route` says another, such as an old address with a
 * `section`) and waits for its panel.
 */
export async function openSearch(options: { permissions?: string[]; route?: string } = {}) {
  const { route = '/storefront?tab=search', ...rest } = options;
  const app = await openStorefront(route, rest);
  await screen.findByRole('tabpanel', { name: 'Search' }, { timeout: 10_000 });
  return app;
}
