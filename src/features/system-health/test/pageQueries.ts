// Queries the page tests share: the verdict box, a key-figure tile and the names of the tabs. Tests only.
import { screen, within } from '@testing-library/react';

/** How long a test waits for an answer of the mock API (the page and its tabs are lazy chunks). */
export const SLOW = { timeout: 8000 };

/** The verdict box, found by its headline. */
export async function verdictOf(name: RegExp) {
  const heading = await screen.findByRole('heading', { level: 2, name }, SLOW);
  const box = heading.closest('section');
  if (!box) throw new Error('The verdict headline is not inside its box.');
  return box;
}

/** One tile of the key figures, by its label. */
export const tileNamed = (name: string) =>
  within(screen.getByRole('region', { name: 'Key figures' })).getByRole('group', { name });

/** The names of the tabs in the strip, in order. */
export const tabNames = () =>
  within(screen.getByRole('tablist', { name: 'System health sections' }))
    .getAllByRole('tab')
    .map((tab) => tab.textContent);
