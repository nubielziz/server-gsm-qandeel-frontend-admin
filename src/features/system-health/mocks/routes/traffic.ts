// Mock routes of the API traffic: `GET /admin/system/metrics` and `GET /admin/system/errors`. Both read the monitoring
// system, so in the `monitoring-down` scenario they answer 503 MONITORING_UNAVAILABLE.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ApiMetrics, ErrorsResponse } from '../../types';
import { invalid } from '@/mocks/handlers/accessShared';
import { buildErrors } from '../buildErrors';
import { buildMetrics } from '../buildMetrics';
import { rangeOf, route } from '../http';
import { SURFACES } from '../specsApi';

// `?surface=` must name a surface of the platform.
function surfaceOf(url: URL): string | undefined | Response {
  const surface = url.searchParams.get('surface') ?? undefined;
  return surface && !SURFACES.some((spec) => spec.key === surface)
    ? invalid([{ field: 'surface', message: 'Unknown surface.' }])
    : surface;
}

export const trafficRoutes: HttpHandler[] = [
  http.get(
    '*/admin/system/metrics',
    route({ gate: 'metrics' }, ({ state, url, now }) => {
      const range = rangeOf(url);
      if (range instanceof Response) return range;
      const surface = surfaceOf(url);
      if (surface instanceof Response) return surface;
      return HttpResponse.json<ApiMetrics>(buildMetrics(state, range, surface, now));
    }),
  ),

  http.get(
    '*/admin/system/errors',
    route({ gate: 'errors' }, ({ state, url, now }) => {
      const range = rangeOf(url);
      if (range instanceof Response) return range;
      const surface = surfaceOf(url);
      if (surface instanceof Response) return surface;
      return HttpResponse.json<ErrorsResponse>(buildErrors(state, range, surface, now));
    }),
  ),
];
