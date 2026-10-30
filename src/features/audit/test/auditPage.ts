// Helpers shared by the audit page tests: open the page signed in (as the Owner, or as a staff member with fewer permissions),
// find the entries and their buttons by accessible name, and answer the list with entries of the test's own. Import from tests only.
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/mocks/node';
import { mockMe, renderApp, signInAs } from '@/test/renderApp';
import type { AuditLog } from '../types';

/** Signs in as Rami (the Owner) and opens a route of the page; `permissions` changes what `me` says before the page loads. */
export async function openAudit(route = '/audit', options: { permissions?: string[] } = {}) {
  await signInAs();
  if (options.permissions) mockMe({ id: 1, name: 'Rami K.', permissions: options.permissions });
  const app = renderApp(route);
  await screen.findByRole('heading', { level: 1, name: 'Audit log' }, { timeout: 10_000 });
  return app;
}

/** The entries on screen right now (the rows of the list, not the sidebar's list items). */
export const entriesNow = () =>
  Array.from(document.querySelectorAll<HTMLElement>('li')).filter((item) => item.querySelector('time'));

/** The entries on screen, once the first page has loaded. */
export async function entries() {
  return waitFor(
    () => {
      const rows = entriesNow();
      if (rows.length === 0) throw new Error('The entries have not loaded yet.');
      return rows;
    },
    { timeout: 5000 },
  );
}

/** The entry that holds some text (a name, an action), as a scope for `within`. */
export async function entryWith(text: string | RegExp) {
  const found = (await entries()).find((item) =>
    typeof text === 'string' ? item.textContent?.includes(text) : text.test(item.textContent ?? ''),
  );
  if (!found) throw new Error(`No entry holds "${String(text)}".`);
  return within(found);
}

/** The "42 entries" count of the toolbar. */
export const countText = () => screen.getByText(/^[\d,]+ entr(y|ies)$/).textContent;

/** Answers `GET /admin/audit-logs` with these entries (a single page), whatever the query says. */
export function answerWith(rows: AuditLog[], total = rows.length) {
  mockServer.use(
    http.get('*/admin/audit-logs', () =>
      HttpResponse.json(rows, { headers: { 'x-total-count': String(total) } }),
    ),
  );
}

/** An entry of the test's own, with the fields a test does not care about filled in. */
export function entry(overrides: Partial<AuditLog> & { id: number }): AuditLog {
  return {
    actorType: 'staff',
    actorId: 1,
    actorName: 'Rami K.',
    action: 'changed',
    entityType: 'setting',
    entityId: 0,
    entityLabel: 'A setting',
    before: { value: 'a' },
    after: { value: 'b' },
    ip: '203.0.113.24',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
