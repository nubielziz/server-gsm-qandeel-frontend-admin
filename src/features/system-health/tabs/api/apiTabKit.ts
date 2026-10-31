// Test helpers shared by the API tab's page tests: the address, the surface names and finders for cards and table rows.
import { screen, within } from '@testing-library/react';
import { SLOW } from '../../test/pageQueries';

/** The address of the tab. */
export const API_TAB = '/system-health?tab=api';

/** The six surfaces of the mock, in the order the server sends them. */
export const SURFACE_NAMES = [
  'Merchant API v1',
  'Dhru Fusion API',
  'Client app',
  'Storefront',
  'Admin console',
  'Incoming webhooks',
];

/** A card of the tab, found by its title (every card is a region named by its heading). */
export const card = (name: string) => screen.findByRole('region', { name }, SLOW);

/** The body rows of a table (the header row left out). */
export const rowsOf = (region: HTMLElement) => within(region).getAllByRole('row').slice(1);

/** The surfaces card once its rows are there. */
export async function surfacesCard() {
  const surfaces = await card('Surfaces');
  await within(surfaces).findByRole('button', { name: 'Merchant API v1' }, SLOW);
  return surfaces;
}
