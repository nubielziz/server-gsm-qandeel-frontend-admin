// Mock of the health route (`GET /health`), polled by the sidebar footer. It follows the dev mock scenario, so the
// footer agrees with the System health page: in `outage` Postgres is down.
import { http, HttpResponse } from 'msw';
import { apiBaseUrl } from '@/lib/api/config';
import { latency } from '../latency';
import { mockScenario } from '../scenario';

/** Path of the root health route: "/health", or "/v1/health" when the API base has a path. */
function rootHealthPath(): string {
  const base = apiBaseUrl();
  const prefix = base ? new URL(base, 'http://localhost').pathname.replace(/\/+$/, '') : '';
  return `${prefix}/health`;
}

export const systemHandlers = [
  // `*/health` also matches `/admin/system/health` (the System health summary). Returning nothing lets that request
  // fall through to the feature's own handler, so only the root route is answered here.
  http.get('*/health', async ({ request }) => {
    if (new URL(request.url).pathname !== rootHealthPath()) return undefined;
    await latency();
    if (mockScenario() === 'outage') {
      return HttpResponse.json({ status: 'down', checks: { postgres: 'down', redis: 'ok' } });
    }
    return HttpResponse.json({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } });
  }),
];
