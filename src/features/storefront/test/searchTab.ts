// Helpers shared by the Search tab tests: open a section of the tab signed in as the Owner (or as a role with fewer permissions),
// and the permission lists the tests use. Import them from tests only.
import { configure, screen } from '@testing-library/react';
import { openStorefront } from './storefrontPage';

// These tests open the whole app, load a page lazily and wait out a 300 ms search pause; a busy machine needs more than the
// default second to find what it waits for.
configure({ asyncUtilTimeout: 5_000 });

export type SearchSection = 'synonyms' | 'pins' | 'report' | 'index';

/** A staff member who reads the storefront, and one who may also change the search rules. */
export const READER = ['storefront:read'];
export const WRITER = ['storefront:read', 'storefront:update'];

/** Opens a section of the Search tab by its address and waits for the sub-navigation. */
export async function openSearch(
  section: SearchSection = 'synonyms',
  options: { permissions?: string[] } = {},
) {
  const route =
    section === 'synonyms' ? '/storefront?tab=search' : `/storefront?tab=search&section=${section}`;
  const app = await openStorefront(route, options);
  await screen.findByRole('tablist', { name: 'Search tools' }, { timeout: 10_000 });
  return app;
}
