// Helpers the page tests of the Overview tab share: find a card by its title, and the components card with its table.
import { screen, within } from '@testing-library/react';
import { SLOW } from '../../test/pageQueries';

/** A card of the tab, found by its title. */
export const card = (name: string | RegExp) => screen.findByRole('region', { name }, SLOW);

/** The components card with its table (the table is there once there is a problem row to show). */
export async function componentsTable() {
  const components = await card('Components');
  const table = await within(components).findByRole('table', { name: 'Components' }, SLOW);
  return { components, table };
}
