// Helpers shared by the dashboard page tests: open the page signed in (as the Owner, or as a staff member with fewer
// permissions) and find panels, controls and rows by their accessible names. Import them from tests only.
import { screen, within } from '@testing-library/react';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';

/** Signs in as Rami (the Owner) and opens a route of the dashboard; `permissions` changes what `me` says before the page loads. */
export async function openDashboard(route = '/dashboard', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 10_000 });
  return app;
}

/** A panel by its title, once it is on the page (a titled `<section>` is a landmark region). */
export async function panelOf(title: string | RegExp) {
  return within(await screen.findByRole('region', { name: title }));
}

/** The titles of the panels now on the page, in reading order (the key-figures strip is not a titled panel). */
export const panelTitles = () =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

/** A segmented control by its group name ("Channel", "Period", "Date range", "View"). */
export const control = (name: string) => within(screen.getByRole('group', { name }));
