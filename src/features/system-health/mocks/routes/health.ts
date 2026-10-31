// Mock routes of the overall health: `GET /admin/system/health`, `GET /admin/system/checks` and
// `PUT /admin/system/maintenance` (the switch that makes customers' requests answer 503 MAINTENANCE).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import type { ChecksResponse, MaintenanceScope, MaintenanceState, SystemHealth } from '../../types';
import { buildChecks, buildSystemHealth } from '../buildHealth';
import { iso } from '../clock';
import { allFacts } from '../facts';
import { futureDate, rangeOf, route, staffRef, supplierRows } from '../http';
import type { ProblemError } from '@/mocks/problem';

const SCOPES: MaintenanceScope[] = ['store', 'checkout', 'api_orders', 'all'];
const OFF: MaintenanceState = {
  enabled: false,
  scope: null,
  message: null,
  expectedEndAt: null,
  startedAt: null,
  startedBy: null,
};

export const healthRoutes: HttpHandler[] = [
  http.get(
    '*/admin/system/health',
    route({}, async ({ state, now }) =>
      HttpResponse.json<SystemHealth>(buildSystemHealth(state, await supplierRows(), now)),
    ),
  ),

  http.get(
    '*/admin/system/checks',
    route({}, async ({ state, url, now }) => {
      const range = rangeOf(url);
      if (range instanceof Response) return range;
      const component = url.searchParams.get('component');
      const facts = allFacts(state, await supplierRows());
      const chosen = component ? facts.filter((fact) => fact.key === component) : facts;
      if (component && chosen.length === 0) return notFound('component', component);
      return HttpResponse.json<ChecksResponse>(buildChecks(state, chosen, range, now));
    }),
  ),

  http.put(
    '*/admin/system/maintenance',
    route({ write: 'system:manage' }, async ({ state, body, now }) => {
      const input = await body();
      if (input.enabled === false) {
        state.maintenance = { ...OFF };
        return HttpResponse.json<MaintenanceState>(state.maintenance);
      }
      const errors: ProblemError[] = [];
      if (input.enabled !== true) errors.push({ field: 'enabled', message: 'Send enabled: true or false.' });
      const scope = SCOPES.find((candidate) => candidate === input.scope);
      if (!scope)
        errors.push({
          field: 'scope',
          message: 'Choose what maintenance closes: store, checkout, API orders or all.',
        });
      const message = textOf(input.message);
      if (message.length < 1 || message.length > 300) {
        errors.push({
          field: 'message',
          message: 'Write the message customers will see (up to 300 characters).',
        });
      }
      // An empty field of the form is no end.
      const end = input.expectedEndAt === '' ? null : (input.expectedEndAt ?? null);
      const endAt = futureDate(end, now);
      if (end !== null && endAt === undefined) {
        errors.push({ field: 'expectedEndAt', message: 'The expected end must be a time in the future.' });
      }
      if (errors.length > 0 || !scope) return invalid(errors);
      // Changing a running maintenance keeps who started it and when.
      const running = state.maintenance.enabled;
      state.maintenance = {
        enabled: true,
        scope,
        message,
        expectedEndAt: endAt === undefined ? null : iso(endAt),
        startedAt: running ? state.maintenance.startedAt : iso(now),
        startedBy: running ? state.maintenance.startedBy : await staffRef(),
      };
      return HttpResponse.json<MaintenanceState>(state.maintenance);
    }),
  ),
];
