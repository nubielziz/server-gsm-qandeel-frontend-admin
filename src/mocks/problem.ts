// Builds `application/problem+json` error responses the way the real API sends them (decision 007).
import { HttpResponse } from 'msw';

/** One entry of a problem's `errors[]`. */
export type ProblemError = { field?: string; message: string };

let counter = 0;

/** A problem response: `problem(404, 'NOT_FOUND', 'Not found', 'No such order.')`. Each one gets a request id. */
export function problem(
  status: number,
  code: string,
  title: string,
  detail?: string,
  errors?: ProblemError[],
): Response {
  counter += 1;
  return HttpResponse.json(
    { type: `urn:gsm:problem:${code.toLowerCase()}`, title, status, code, detail, errors },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': `mock-req-${counter}` },
    },
  );
}
