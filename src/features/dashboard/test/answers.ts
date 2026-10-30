// Test helpers that make the mock API answer the dashboard routes with fixed data, and record what was asked. Import them
// from tests only.
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import type { Dashboard, TopClient } from '../types';

type Answer<T> = T | Response | ((url: URL) => T | Response | Promise<T | Response>);

// A function answer gets the request address; anything else is sent as JSON. A ready Response is cloned for each request,
// because a body can be read only once and the page and the sidebar both ask.
async function reply<T>(answer: Answer<T>, url: URL): Promise<Response> {
  const value = typeof answer === 'function' ? await (answer as (url: URL) => T | Response)(url) : answer;
  return value instanceof Response ? value.clone() : HttpResponse.json(value as never);
}

/** Answers `GET /admin/dashboard` from now on in this test. Returns the list of request addresses, filled as they arrive. */
export function answerDashboard(answer: Answer<Dashboard>): URL[] {
  const seen: URL[] = [];
  mockServer.use(
    http.get('*/admin/dashboard', ({ request }) => {
      const url = new URL(request.url);
      seen.push(url);
      return reply(answer, url);
    }),
  );
  return seen;
}

/** Answers `GET /admin/reports/top-clients`; returns the request addresses like `answerDashboard`. */
export function answerTopClients(answer: Answer<TopClient[]>): URL[] {
  const seen: URL[] = [];
  mockServer.use(
    http.get('*/admin/reports/top-clients', ({ request }) => {
      const url = new URL(request.url);
      seen.push(url);
      return reply(answer, url);
    }),
  );
  return seen;
}

/** A problem+json answer, such as `refuse(403, 'FORBIDDEN', 'No access', 'You may not read the dashboard.')`. */
export const refuse = (status: number, code: string, title: string, detail: string): Response =>
  problem(status, code, title, detail);
