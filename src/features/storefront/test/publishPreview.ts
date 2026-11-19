// Helpers for the tests of the Publish tab's preview (the draft, run 5 of the mock: all 60 rows): open it, find a row by its service
// code, and say what the page asked the server. Import them from tests only.
import { configure, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { openRun } from './publishPage';
import type { recordRequests } from './requests';

// These tests open the whole app, load 50 rows of a table and wait out the 300 ms search pause; a machine that is busy with another
// check needs more than the default three seconds to find what they wait for.
configure({ asyncUtilTimeout: 8_000 });

/** The caption of the preview table. */
export const PREVIEW = 'Publish preview';

/** The mock's draft: the preview of all 60 rows (ready 30, review 11, blocked 19, ticked 30, three waiting for a rule). */
export const DRAFT = 5;

/** The code of the made-up service of a mock row: row `id` is `IMP-<100 + id>` (the rows of real services keep their own codes). */
export const codeOf = (id: number) => `IMP-${100 + id}`;

/** Opens the draft and waits for its first row. */
export async function openPreview(options: { permissions?: string[] } = {}) {
  const app = await openRun(DRAFT, options);
  await screen.findByText('AT&T USA Premier Unlock');
  return app;
}

/** The table row that holds a service code (`IMP-101`), to look into with `within`. */
export async function previewRow(code: string) {
  const mark = await screen.findByText(new RegExp(`^${code}\\b`));
  const row = mark.closest('tr');
  if (!row) throw new Error(`No row of the preview holds ${code}.`);
  return within(row);
}

/** The rows requests of the draft (`GET /admin/publish-runs/5/items`), oldest first. */
export function itemReads(requests: ReturnType<typeof recordRequests>, runId = DRAFT) {
  return requests
    .sent()
    .filter(
      (sent) => sent.method === 'GET' && sent.url.pathname.endsWith(`/admin/publish-runs/${runId}/items`),
    );
}

/** The query of the last rows request, as a plain object (a key that repeats keeps the last value). */
export function lastItemsQuery(requests: ReturnType<typeof recordRequests>, runId = DRAFT) {
  const reads = itemReads(requests, runId);
  const last = reads[reads.length - 1];
  if (!last) throw new Error('No rows request was sent.');
  return Object.fromEntries(last.url.searchParams.entries());
}

/** Opens the row dialog of the row with a service code, and gives the queries of the dialog. */
export async function openRowDialog(user: UserEvent, code: string) {
  const row = await previewRow(code);
  await user.click(row.getByRole('button', { name: /^Edit / }));
  return within(await screen.findByRole('dialog', { name: 'Edit row' }));
}

/** The requests of one method to the rows of the draft (`PATCH .../items/<id>`, `POST .../items/bulk`), oldest first. */
export function itemWrites(
  requests: ReturnType<typeof recordRequests>,
  method: 'PATCH' | 'POST',
  runId = DRAFT,
) {
  return requests
    .sent()
    .filter(
      (sent) =>
        sent.method === method &&
        new RegExp(`/admin/publish-runs/${runId}/items(/|$)`).test(sent.url.pathname),
    );
}
