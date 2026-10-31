// A small, complete `SystemHealth` answer for page tests that need to control what `GET /admin/system/health` says (flip
// the status between two reads, fail it, switch maintenance on) instead of playing a whole mock scenario. Tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Measure, SystemHealth } from '../types';

const measure = (value: number, unit: Measure['unit'], state: Measure['state'] = 'ok'): Measure => ({
  value,
  unit,
  state,
});

/** An operational platform with nothing open. Pass the fields a test cares about. */
export function systemHealth(over: Partial<SystemHealth> = {}): SystemHealth {
  return {
    status: 'operational',
    since: null,
    checkedAt: new Date().toISOString(),
    monitoring: { status: 'available', detail: null, lastScrapeAt: null },
    build: { version: 'v1.0.0', commit: 'abc1234', environment: 'test', deployedAt: null },
    components: [],
    uptime: {
      h24: measure(100, 'percent'),
      d7: measure(100, 'percent'),
      d30: measure(99.95, 'percent'),
      daily: [],
    },
    alerts: { open: measure(0, 'count'), critical: 0, items: [], trend: [] },
    incidents: [],
    maintenance: {
      enabled: false,
      scope: null,
      message: null,
      expectedEndAt: null,
      startedAt: null,
      startedBy: null,
    },
    ...over,
  };
}

/**
 * Answers `GET /admin/system/health` with whatever `answer()` returns at the time of the read, so a test can change the
 * platform between two reads (flip the status, switch maintenance on). Put it in front of the mock with `mockServer.use(...)`.
 */
export function serveHealth(answer: () => SystemHealth): HttpHandler {
  return http.get('*/admin/system/health', () => HttpResponse.json(answer()));
}
