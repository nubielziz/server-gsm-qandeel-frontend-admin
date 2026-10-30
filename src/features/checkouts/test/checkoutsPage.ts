// Helpers shared by the checkouts page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions),
// serve chosen rows instead of the mock table, and find the table, rows and buttons by their accessible names. Import from tests only.
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/mocks/node';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';
import type { AbandonedCheckout, FunnelReport } from '../types';

/** Signs in as Rami (the Owner) and opens a route of the page; `permissions` changes what `me` says before the page loads. */
export async function openCheckouts(route = '/checkouts', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Abandoned checkouts' }, { timeout: 10_000 });
  return app;
}

/** The checkouts table, once it has loaded. */
export async function checkoutsTable() {
  return within(await screen.findByRole('table', { name: 'Abandoned checkouts' }));
}

/** The row of the table that holds some text (an email, a service). Dialogs and toasts are not searched. */
export async function checkoutRow(text: string) {
  const row = (await (await checkoutsTable()).findByText(text)).closest('tr');
  if (!row) throw new Error(`No checkout row holds "${text}".`);
  return within(row);
}

/**
 * Serves these rows for `GET /admin/checkouts/abandoned` (with `total` in the header, the row count by default). Returns the
 * addresses asked so far, so a test can check what the page sent.
 */
export function serveCheckouts(rows: AbandonedCheckout[], total = rows.length): URL[] {
  const asked: URL[] = [];
  mockServer.use(
    http.get('*/admin/checkouts/abandoned', ({ request }) => {
      asked.push(new URL(request.url));
      return HttpResponse.json(rows, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  );
  return asked;
}

/** Serves this report for `GET /admin/reports/funnel`. Returns the addresses asked so far. */
export function serveFunnel(report: FunnelReport | ((days: number) => FunnelReport)): URL[] {
  const asked: URL[] = [];
  mockServer.use(
    http.get('*/admin/reports/funnel', ({ request }) => {
      const url = new URL(request.url);
      asked.push(url);
      const days = Number(url.searchParams.get('days') ?? 30);
      return HttpResponse.json(typeof report === 'function' ? report(days) : report);
    }),
  );
  return asked;
}

/** The button group of the filter ("Needs a reminder", "All"). */
export const filterGroup = () => within(screen.getByRole('group', { name: 'Checkout filter' }));
