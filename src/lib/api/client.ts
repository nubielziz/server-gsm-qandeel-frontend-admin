// The only module in src that calls `fetch` (project rule). Every request sends the session cookie and, for
// mutations, the CSRF header; every failure becomes an ApiError (decisions 005, 006, 007).
import { apiBaseUrl } from './config';
import { getCsrfToken, rememberCsrfToken } from './csrf';
import { filenameFromDisposition, saveBlob } from './download';
import { ApiError, isAbortError, networkError, parseErrorResponse } from './errors';
import { listQueryToParams, toQueryString, type QueryInput } from './query';
import type { FilterValue, ListQuery, ListResult } from './types';

/** Per-call options: cancel the request, or add headers (for example an idempotency key). */
export type ApiInit = { signal?: AbortSignal; headers?: Record<string, string> };

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Fills the `:name` placeholders of a manifest path, so API functions can keep the path text verbatim:
 * `pathOf('/admin/staff/:id/suspend', { id })`. Values are URL-encoded; a missing value throws.
 */
export function pathOf(template: string, params: Record<string, string | number>): string {
  return template.replace(/:([A-Za-z_]\w*)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null || value === '') {
      throw new Error(`pathOf: missing "${name}" for ${template}`);
    }
    return encodeURIComponent(String(value));
  });
}

/**
 * Absolute URL of an API path, for plain links (file downloads, the queue monitor) and for `fetch`.
 * With no `VITE_API_BASE_URL` the current origin is used, so the same code works behind a dev proxy.
 */
export function apiUrl(path: string, query?: QueryInput): string {
  const qs = toQueryString(query);
  const target = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const url = qs ? `${target}${target.includes('?') ? '&' : '?'}${qs}` : target;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = globalThis.location?.origin;
  return origin && origin !== 'null' ? new URL(url, origin).toString() : url;
}

// FormData, Blob and URLSearchParams go out as they are (the browser sets their Content-Type); the rest is JSON.
function isRawBody(body: unknown): body is FormData | Blob | URLSearchParams | ArrayBuffer {
  return (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  );
}

/** Sends one request and returns the response when it is 2xx; anything else throws an ApiError. */
async function send(
  method: Method,
  path: string,
  options: { query?: QueryInput; body?: unknown; init?: ApiInit; accept?: string } = {},
): Promise<Response> {
  const { query, body, init, accept = 'application/json' } = options;
  const headers = new Headers(init?.headers);
  headers.set('Accept', accept);

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isRawBody(body)) {
      payload = body;
    } else {
      payload = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    }
  }
  if (method !== 'GET') {
    const token = getCsrfToken();
    if (token) headers.set('X-CSRF-Token', token);
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path, query), {
      method,
      headers,
      body: payload,
      credentials: 'include',
      signal: init?.signal,
    });
  } catch (error) {
    // A cancelled request is not a failure: the caller (React Query) expects the original AbortError.
    if (isAbortError(error)) throw error;
    throw networkError(error);
  }
  rememberCsrfToken(res);
  if (!res.ok) throw await parseErrorResponse(res);
  return res;
}

/** Reads a JSON body; a 204 or an empty body gives `undefined`. */
async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) return undefined as T;
  const raw = await res.text();
  if (raw.trim() === '') return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch (cause) {
    throw new ApiError({
      status: res.status,
      code: 'INVALID_RESPONSE',
      title: 'Unreadable response',
      detail: 'The server answered with something that is not valid JSON.',
      requestId: res.headers.get('X-Request-Id') ?? undefined,
      cause,
    });
  }
}

/** GET a JSON resource. */
export async function apiGet<T>(path: string, query?: QueryInput, init?: ApiInit): Promise<T> {
  return readJson<T>(await send('GET', path, { query, init }));
}

/** POST a JSON body (or none, for action endpoints). */
export async function apiPost<T>(path: string, body?: unknown, init?: ApiInit): Promise<T> {
  return readJson<T>(await send('POST', path, { body, init }));
}

export async function apiPut<T>(path: string, body?: unknown, init?: ApiInit): Promise<T> {
  return readJson<T>(await send('PUT', path, { body, init }));
}

export async function apiPatch<T>(path: string, body?: unknown, init?: ApiInit): Promise<T> {
  return readJson<T>(await send('PATCH', path, { body, init }));
}

export async function apiDelete<T>(path: string, body?: unknown, init?: ApiInit): Promise<T> {
  return readJson<T>(await send('DELETE', path, { body, init }));
}

/**
 * GET a list endpoint (simple-rest): rows come in the body, the total in `x-total-count`.
 * When the header is missing the total is the number of rows received.
 */
export async function apiList<T>(
  path: string,
  query?: ListQuery,
  extra?: Record<string, FilterValue | FilterValue[] | undefined>,
  init?: ApiInit,
): Promise<ListResult<T>> {
  const res = await send('GET', path, { query: listQueryToParams(query, extra), init });
  const rows = await readJson<T[] | undefined>(res);
  const data = Array.isArray(rows) ? rows : [];
  const header = res.headers.get('x-total-count');
  const total =
    header !== null && header.trim() !== '' && Number.isFinite(Number(header)) ? Number(header) : data.length;
  return { data, total };
}

/**
 * GET a file (CSV or another export) and hand it to the browser as a download.
 * The name comes from Content-Disposition, else `fallbackName`; the name used is returned.
 */
export async function apiDownload(
  path: string,
  query: QueryInput | undefined,
  fallbackName: string,
  init?: ApiInit,
): Promise<string> {
  const res = await send('GET', path, { query, init, accept: '*/*' });
  const blob = await res.blob();
  const name = filenameFromDisposition(res.headers.get('Content-Disposition')) ?? fallbackName;
  saveBlob(blob, name);
  return name;
}
