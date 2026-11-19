// Helpers shared by the Publish tab's tests: open the tab (at its start or on a run) signed in, find the last request of a method,
// and move a mock run on by the reads the page makes. Import them from tests only.
import { screen } from '@testing-library/react';
import { openStorefront } from './storefrontPage';
import type { recordRequests } from './requests';

/** The tab's address, with or without a run. */
export const publishRoute = (runId?: number) =>
  runId === undefined ? '/storefront?tab=publish' : `/storefront?tab=publish&run=${runId}`;

/** Opens the Publish tab at its start and waits for its heading. */
export async function openPublishStart(options: { permissions?: string[] } = {}) {
  const app = await openStorefront(publishRoute(), options);
  await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' });
  return app;
}

/** Opens a run's page and waits for its heading. */
export async function openRun(runId: number, options: { permissions?: string[] } = {}) {
  const app = await openStorefront(publishRoute(runId), options);
  await screen.findByRole('heading', { level: 2, name: `Publish run ${runId}` });
  return app;
}

/** The last request of a method (a write is followed by the reads it makes stale). */
export function lastOf(requests: ReturnType<typeof recordRequests>, method: string, path?: RegExp) {
  const found = requests
    .sent()
    .filter((sent) => sent.method === method && (!path || path.test(sent.url.pathname)));
  const last = found[found.length - 1];
  if (!last) throw new Error(`No ${method} request${path ? ` to ${String(path)}` : ''} was sent.`);
  return last;
}

/** Every permission of the tab, for a test that takes one away. */
export const PUBLISH_PERMISSIONS = [
  'storefront:read',
  'storefront:create',
  'storefront:update',
  'storefront:publish',
  'pricing:read',
  'catalog:read',
  'suppliers:read',
];
