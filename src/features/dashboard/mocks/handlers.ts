// Mock of the dashboard routes: `GET /admin/dashboard` (all panels from the live order store, ledger and demo seed) and
// `GET /admin/reports/top-clients`. `GET /admin/queues` is a web page the console only links to, so it has no mock.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { guard } from '@/mocks/session';
import type { DashboardDays, DashboardScope } from '../types';
import { buildDashboard } from './dashboard';
import { topClients } from './topClients';
import { loadWorld, type World } from './world';

const SCOPES: readonly DashboardScope[] = ['all', 'b2b', 'b2c'];
const DAYS: readonly DashboardDays[] = [1, 7, 14];

// The 422 the real server gives for a value outside the choices.
const outsideChoices = (field: string, choices: readonly (string | number)[]) =>
  problem(422, 'VALIDATION_FAILED', 'Check the request', `${field} must be one of ${choices.join(', ')}.`, [
    { field, message: `Use one of ${choices.join(', ')}` },
  ]);

// Refuses a request without a full session like the real server (401, or 403 on a bad CSRF token).
async function worldFor(request: Request): Promise<World | Response> {
  return guard(request) ?? (await loadWorld());
}

export const dashboardHandlers: HttpHandler[] = [
  http.get('*/admin/dashboard', async ({ request }) => {
    const world = await worldFor(request);
    if (world instanceof Response) return world;
    await latency();
    const query = new URL(request.url).searchParams;
    const scope = SCOPES.find((candidate) => candidate === (query.get('scope') ?? 'all'));
    const days = DAYS.find((candidate) => String(candidate) === (query.get('days') ?? '7'));
    if (!scope) return outsideChoices('scope', SCOPES);
    if (!days) return outsideChoices('days', DAYS);
    return HttpResponse.json(buildDashboard(world, { scope, days }));
  }),
  http.get('*/admin/reports/top-clients', async ({ request }) => {
    const world = await worldFor(request);
    if (world instanceof Response) return world;
    await latency();
    const query = new URL(request.url).searchParams;
    const days = DAYS.find((candidate) => String(candidate) === (query.get('days') ?? '7'));
    const limit = Number(query.get('limit') ?? 6);
    if (!days) return outsideChoices('days', DAYS);
    return HttpResponse.json(topClients(world, days, Number.isInteger(limit) && limit > 0 ? limit : 6));
  }),
];
