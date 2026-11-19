// Mock of the publish run routes (`/admin/publish-runs*`): start, list, read, apply, cancel and the run switch (the rows' routes are in
// `publishItemRoutes.ts`). It plays the server for the refusals of plan 5.2 (nothing to publish, a wrong state, a job already running, a 403)
// and moves a run by reads, never timers. It works out no price, title or slug (M92).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { denied } from '@/features/notifications/mocks/access';
import { bodyOf, conflict, invalid, listAnswer, notFound, signedIn } from './http';
import { advance, emptyCounts, reopen, viewOf } from './publishDto';
import { publishItemRoutes } from './publishItemRoutes';
import { MOCK_STAFF } from './publishSeed';
import { rowsOfScope } from './publishScope';
import { storefrontStore } from './store';
import type { MockPublishRun } from './types';

/** The 409 that says a job is already going (a different code from the plain conflict). */
const busy = (detail: string) => conflict('JOB_ALREADY_RUNNING', 'Already running', detail);
const wrongState = (detail: string) => conflict('CONFLICT', 'Not in the right state', detail);
const switching = (m: MockPublishRun) =>
  m.run.switch.status === 'queued' || m.run.switch.status === 'running';

/** Reads `:id` of a request: the run, or the 404. */
async function runOf(params: Record<string, unknown>) {
  const stores = await storefrontStore();
  const m = stores.publish.runs.find(String(params.id));
  return { stores, m, missing: m ? null : notFound('publish run', params.id) };
}

/** The run routes. Specific paths first: the rows' routes and the actions before `/:id`. */
export const publishRoutes: HttpHandler[] = [
  ...publishItemRoutes,

  http.post('*/admin/publish-runs', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const made = rowsOfScope(stores, body.scope);
      if ('refusal' in made) return made.refusal;
      const old = made.replaces;
      const id = stores.publish.runs.list().reduce((top, row) => Math.max(top, row.id), 0) + 1;
      const now = new Date().toISOString();
      const listed = typeof body.listed === 'boolean' ? body.listed : (old?.run.listed ?? true);
      const created = stores.publish.runs.insert({
        id,
        run: {
          id,
          status: 'preparing',
          source: 'console',
          quickAddRunId: null,
          scope: body.scope as MockPublishRun['run']['scope'],
          listed,
          auto: false,
          total: made.rows.length,
          counts: emptyCounts(),
          switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
          replacedBy: null,
          error: null,
          requestedBy: MOCK_STAFF.id,
          requestedByName: MOCK_STAFF.name,
          createdAt: now,
          preparedAt: null,
          startedAt: null,
          finishedAt: null,
        },
        items: made.rows,
        reads: 0,
        switchReads: 0,
        refusals: new Map(),
      });
      // "Check again" cancels the draft it replaces in the same transaction and links the two.
      if (old) {
        old.run.status = 'cancelled';
        old.run.replacedBy = id;
      }
      return HttpResponse.json(viewOf(created), { status: 202 });
    }),
  ),

  http.get('*/admin/publish-runs', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      // Quick add's step 3 reads the runs of its Quick add run: the automatic one (`quickAddRunId`, the view's key) and the one staff
      // made with "Prepare the shop preview" (scope `quickAddRun`; its `quickAddRunId` stays null, plan correction 13). Each such read
      // moves an automatic run one step (never timers). The history and every other list read leave the runs where they are.
      const url = new URL(request.url);
      const quickAddRunId = url.searchParams.get('quickAddRunId');
      let runs = stores.publish.runs.list();
      if (quickAddRunId !== null) {
        for (const m of runs) {
          if (m.run.auto && String(m.run.quickAddRunId) === quickAddRunId) advance(m);
        }
        runs = runs.filter(
          ({ run }) =>
            String(run.quickAddRunId) === quickAddRunId ||
            (run.scope.kind === 'quickAddRun' && String(run.scope.runId) === quickAddRunId),
        );
        // The filter is answered here: the generic filter would compare the view's own key and lose the staff run.
        url.searchParams.delete('quickAddRunId');
      }
      return listAnswer(runs.map(viewOf), new Request(url), []);
    }),
  ),

  http.post('*/admin/publish-runs/:id/apply', ({ request, params }) =>
    signedIn(request, async () => {
      const { m, missing } = await runOf(params);
      if (!m) return missing as Response;
      const body = await bodyOf(request);
      const { run } = m;
      if (run.status === 'queued' || run.status === 'running')
        return busy('This run is already being published.');
      if (switching(m)) return busy('This run is being switched.');
      if (run.status === 'preparing') return wrongState('The preview is still being prepared.');
      if (run.status === 'succeeded' || run.status === 'cancelled')
        return wrongState('This run is finished. Start a new one.');
      if (run.status === 'failed' && run.preparedAt === null)
        return wrongState('The preview was not finished. Start a new one.');
      if (run.status === 'draft' && !m.items.some((item) => item.included))
        return invalid([{ field: 'included', message: 'No row is included.' }]);
      if (run.status === 'failed') reopen(m);
      if (typeof body.listed === 'boolean') run.listed = body.listed;
      run.status = 'queued';
      run.error = null;
      return HttpResponse.json(viewOf(m), { status: 202 });
    }),
  ),

  http.post('*/admin/publish-runs/:id/cancel', ({ request, params }) =>
    signedIn(request, async () => {
      const { m, missing } = await runOf(params);
      if (!m) return missing as Response;
      const { run } = m;
      // Stopping a run that is queued or running also needs storefront:publish (plan 5.2); discarding a draft needs only the tab's own.
      if (run.status === 'queued' || run.status === 'running') {
        const forbidden = await denied(request, 'storefront:publish');
        if (forbidden) return forbidden;
      }
      if (
        run.status !== 'preparing' &&
        run.status !== 'draft' &&
        run.status !== 'queued' &&
        run.status !== 'running'
      )
        return wrongState('This run is already finished.');
      run.status = 'cancelled';
      if (run.startedAt !== null) run.finishedAt = new Date().toISOString();
      return HttpResponse.json(viewOf(m));
    }),
  ),

  http.post('*/admin/publish-runs/:id/listed', ({ request, params }) =>
    signedIn(request, async () => {
      const { m, missing } = await runOf(params);
      if (!m) return missing as Response;
      const body = await bodyOf(request);
      if (typeof body.listed !== 'boolean')
        return invalid([{ field: 'listed', message: 'Send true or false.' }]);
      if (switching(m)) return busy('This run is being switched.');
      const { status } = m.run;
      if (status !== 'succeeded' && status !== 'failed' && status !== 'cancelled')
        return wrongState('Only a finished run can be switched.');
      if (!m.items.some((item) => item.result === 'published'))
        return wrongState('This run published nothing.');
      m.run.switch = { status: 'queued', listed: body.listed, switched: 0, skipped: 0, error: null };
      m.run.listed = body.listed;
      return HttpResponse.json(viewOf(m), { status: 202 });
    }),
  ),

  http.get('*/admin/publish-runs/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { m, missing } = await runOf(params);
      if (!m) return missing as Response;
      advance(m);
      return HttpResponse.json(viewOf(m));
    }),
  ),
];
