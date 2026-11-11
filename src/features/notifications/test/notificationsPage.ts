// Helpers shared by the notifications page tests: open a route signed in (as the Owner, or as a staff member with fewer permissions), serve chosen campaigns instead
// of the mock store, and find the table, rows and dialogs by their accessible names. Import from tests only.
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/mocks/node';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';
import type { Campaign, CampaignDetail } from '../types';

/** Signs in as Rami (the Owner) and opens a route; `permissions` changes what `me` says before the page loads. */
export async function openNotifications(
  route = '/notifications',
  options: { permissions?: string[]; heading?: string } = {},
) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole(
    'heading',
    { level: 1, name: options.heading ?? 'Notifications' },
    { timeout: 10_000 },
  );
  return app;
}

/** The campaigns table, once it has loaded. */
export async function campaignsTable() {
  return within(await screen.findByRole('table', { name: 'Notification campaigns' }));
}

/** The row of the table that holds some text (a campaign name). */
export async function campaignRow(text: string) {
  const row = (await (await campaignsTable()).findByText(text)).closest('tr');
  if (!row) throw new Error(`No campaign row holds "${text}".`);
  return within(row);
}

/** Serves these rows for `GET /admin/notification-campaigns` (with the total in the header). Returns the addresses asked so far. */
export function serveCampaigns(rows: Campaign[], total = rows.length): URL[] {
  const asked: URL[] = [];
  mockServer.use(
    http.get('*/admin/notification-campaigns', ({ request }) => {
      asked.push(new URL(request.url));
      return HttpResponse.json(rows, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  );
  return asked;
}

/** Serves this detail for `GET /admin/notification-campaigns/:id`. Returns the addresses asked so far. */
export function serveCampaign(detail: CampaignDetail | (() => CampaignDetail)): URL[] {
  const asked: URL[] = [];
  mockServer.use(
    http.get(
      `*/admin/notification-campaigns/${typeof detail === 'function' ? detail().id : detail.id}`,
      ({ request }) => {
        asked.push(new URL(request.url));
        return HttpResponse.json(typeof detail === 'function' ? detail() : detail);
      },
    ),
  );
  return asked;
}

/** What a recorded request looked like. */
export type Sent = { method: string; url: URL; body: unknown };

/** Records every request whose path contains `part` (the body already parsed). The list fills while the test runs; the listener goes with the mock server's reset. */
export function recordRequests(part: string): Sent[] {
  const sent: Sent[] = [];
  mockServer.events.on('request:start', ({ request }) => {
    if (!request.url.includes(part)) return;
    void request
      .clone()
      .text()
      .then((text) =>
        sent.push({
          method: request.method,
          url: new URL(request.url),
          body: text ? JSON.parse(text) : undefined,
        }),
      );
  });
  return sent;
}

/** The dialog or drawer with this name. */
export const dialogOf = (name: string | RegExp) => within(screen.getByRole('dialog', { name }));
