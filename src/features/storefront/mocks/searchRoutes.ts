// Mock of the Search tab's routes (`/admin/search/index` and its rebuild). The mock plays the server for the rules the backend plan
// states: a second rebuild is refused (409 JOB_ALREADY_RUNNING) and a rebuild needs an engine that answers (503 UNAVAILABLE).
// Nothing here touches a real engine.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { conflict, signedIn } from './http';
import { storefrontStore } from './store';

/** How long a mock rebuild runs, in milliseconds. */
export const REBUILD_MS = 8_000;

/** The Search tab's routes. */
export const searchRoutes: HttpHandler[] = [
  http.get('*/admin/search/index', ({ request }) =>
    signedIn(request, async () => {
      const { index } = (await storefrontStore()).search;
      // A rebuild ends by itself after `REBUILD_MS`: the documents count stays, the last rebuild moves to now.
      if (index.rebuildStartedAt !== null && Date.now() - index.rebuildStartedAt >= REBUILD_MS) {
        index.status.lastRebuildAt = new Date().toISOString();
        index.status.lastTermsBuildAt = index.status.lastRebuildAt;
        index.status.rebuild = { running: false, startedAt: null };
        index.rebuildStartedAt = null;
      }
      return HttpResponse.json(index.status);
    }),
  ),
  http.post('*/admin/search/index/rebuild', ({ request }) =>
    signedIn(request, async () => {
      const { index } = (await storefrontStore()).search;
      if (index.status.rebuild.running) {
        return conflict(
          'JOB_ALREADY_RUNNING',
          'Rebuild already running',
          'A rebuild of the search index is already running.',
        );
      }
      if (index.status.engine.status !== 'ok') {
        return problem(
          503,
          'UNAVAILABLE',
          'Search engine unavailable',
          'The search engine is not answering.',
        );
      }
      index.rebuildStartedAt = Date.now();
      index.status.rebuild = { running: true, startedAt: new Date(index.rebuildStartedAt).toISOString() };
      return new HttpResponse(null, { status: 202 });
    }),
  ),
];
