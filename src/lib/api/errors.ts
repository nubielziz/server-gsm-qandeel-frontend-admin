// ApiError and the problem+json parser (decision 007). Every failed request becomes one ApiError, so
// screens handle a single error type and Refine forms can map `errors` onto their fields.
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

/** Error codes the console reacts to (decision 007). The server may send others; they pass through as plain strings. */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  TOKEN_INVALID: 'TOKEN_INVALID',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ApiErrorInit = {
  status: number;
  code?: string;
  title?: string;
  detail?: string;
  type?: string;
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  requestId?: string;
  retryAfter?: number;
  cause?: unknown;
};

/**
 * The one error type the console throws for a failed request. It is shaped like Refine's `HttpError`
 * (`message`, `statusCode`, `errors`), so Refine hooks and forms understand it without conversion.
 * Status 0 means the request never got an answer (see `networkError`).
 */
export class ApiError extends Error {
  readonly status: number;
  /** Same as `status`; Refine reads this name. */
  readonly statusCode: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string | undefined;
  readonly type: string | undefined;
  /** Messages per field, from the problem's `errors[]`. Keys use dots for nesting (`items.0.name`). */
  readonly fieldErrors: Record<string, string[]>;
  /** Same data as `fieldErrors`, in the shape Refine's `useForm` maps onto fields. */
  readonly errors: Record<string, string[]>;
  /** Messages from `errors[]` that name no field; they belong in the form's general error slot. */
  readonly formErrors: string[];
  /** Value of the `X-Request-Id` response header, to quote when reporting a problem. */
  readonly requestId: string | undefined;
  /** Seconds to wait before retrying, from `Retry-After` (429). */
  readonly retryAfter: number | undefined;

  constructor(init: ApiErrorInit) {
    const title = init.title ?? `Request failed (HTTP ${init.status})`;
    super(init.detail ?? title, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.statusCode = init.status;
    this.code = init.code ?? `HTTP_${init.status}`;
    this.title = title;
    this.detail = init.detail;
    this.type = init.type;
    this.fieldErrors = init.fieldErrors ?? {};
    this.errors = this.fieldErrors;
    this.formErrors = init.formErrors ?? [];
    this.requestId = init.requestId;
    this.retryAfter = init.retryAfter;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Wraps a failed `fetch` (offline, DNS, CORS, server down) so callers see the same error type as for HTTP errors. */
export function networkError(cause?: unknown): ApiError {
  return new ApiError({
    status: 0,
    code: ERROR_CODES.NETWORK_ERROR,
    title: 'Network error',
    detail: 'Could not reach the server. Check your connection and try again.',
    cause,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A non-empty trimmed string, or undefined. */
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Turns the many ways a server names a field into the dotted path react-hook-form uses:
 * `/a/b`, `#/a/b`, `body.a`, `a[0].b` and `['body', 'a']` become `a.b`, `a`, `a`, `a.0.b` and `a`.
 */
export function fieldPath(raw: unknown): string | undefined {
  let segments: string[];
  if (Array.isArray(raw)) {
    segments = raw.map(String);
  } else {
    const value = text(raw);
    if (!value) return undefined;
    const path = value.replace(/^#/, '');
    segments = path.startsWith('/')
      ? path
          .slice(1)
          .split('/')
          .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
      : path.replace(/\[(\w+)\]/g, '.$1').split('.');
  }
  const parts = segments.map((s) => s.trim()).filter(Boolean);
  // A leading "$" or "body" only says where the field was found; "body" alone can be a real field name.
  while (parts.length > 1 && (parts[0] === '$' || parts[0] === 'body')) parts.shift();
  return parts.length > 0 ? parts.join('.') : undefined;
}

const FIELD_KEYS = ['field', 'path', 'pointer', 'name', 'param'] as const;
const MESSAGE_KEYS = ['message', 'detail', 'title', 'code'] as const;

// One entry of `errors[]`: a plain string, or an object with a field key and a message key (see FIELD_KEYS, MESSAGE_KEYS).
function readItem(item: unknown): { field?: string; message: string } | undefined {
  if (typeof item === 'string') {
    const message = text(item);
    return message ? { message } : undefined;
  }
  if (!isRecord(item)) return undefined;
  const message = MESSAGE_KEYS.map((key) => text(item[key])).find(Boolean);
  if (!message) return undefined;
  const field = FIELD_KEYS.map((key) => fieldPath(item[key])).find(Boolean);
  return field ? { field, message } : { message };
}

/** Reads `errors[]` (or an `{ field: message(s) }` map) into per-field messages and general messages. */
function readErrors(raw: unknown): { fieldErrors: Record<string, string[]>; formErrors: string[] } {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  const add = (field: string | undefined, message: string) => {
    if (field) (fieldErrors[field] ??= []).push(message);
    else formErrors.push(message);
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const read = readItem(item);
      if (read) add(read.field, read.message);
    }
  } else if (isRecord(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      const field = fieldPath(key);
      for (const entry of Array.isArray(value) ? value : [value]) {
        const read = readItem(entry);
        if (read) add(field, read.message);
      }
    }
  }
  return { fieldErrors, formErrors };
}

/** `Retry-After` is either seconds or an HTTP date; both become whole seconds. */
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const value = header.trim();
  if (/^\d+$/.test(value)) return Number(value);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

/** JSON.parse that gives undefined for empty or invalid text instead of throwing. */
function parseJson(raw: string): unknown {
  if (raw.trim() === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Builds an ApiError from a non-2xx response. Understands problem+json
 * (`type, title, status, code, detail, errors[]`), other JSON, and plain text; an HTML page from a proxy is
 * ignored. It never throws, so callers always get an ApiError.
 */
export async function parseErrorResponse(res: Response): Promise<ApiError> {
  const raw = await res.text().catch(() => '');
  const json = parseJson(raw);
  const body = isRecord(json) ? json : {};
  const { fieldErrors, formErrors } = readErrors(body.errors ?? (Array.isArray(json) ? json : undefined));
  const plain =
    json === undefined && raw.trim() !== '' && !raw.trimStart().startsWith('<') ? raw.trim() : undefined;
  return new ApiError({
    status: res.status,
    code: text(body.code),
    title: text(body.title) ?? text(res.statusText),
    detail: text(body.detail) ?? text(body.message) ?? plain?.slice(0, 300),
    type: text(body.type),
    fieldErrors,
    formErrors,
    requestId: res.headers.get('X-Request-Id') ?? text(body.requestId) ?? text(body.request_id) ?? undefined,
    retryAfter: parseRetryAfter(res.headers.get('Retry-After')),
  });
}

/** True for the error `fetch` raises when an AbortSignal fires. Duck-typed: jsdom and Node use different classes. */
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/** A field name is known when the form has it, or has its parent (`items` for `items.0.name`). */
function isKnownField(name: string, fields: readonly string[]): boolean {
  return fields.some((field) => name === field || name.startsWith(`${field}.`));
}

/**
 * Puts a server error onto a react-hook-form form: each field message goes to its field (the first one gets
 * focus, like the demo), and the messages that have no field are returned so the dialog can show them in its
 * error slot. Pass `fields` (the form's field names) so messages about unknown fields are returned too, and
 * `aliases` when the API's field name differs from the form's (`{ cidr: 'ip' }`).
 * If the error carries no field messages at all, its detail or title is returned, so something is always shown.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: { fields?: readonly string[]; aliases?: Readonly<Record<string, string>> } = {},
): string[] {
  if (!isApiError(error)) return [error instanceof Error ? error.message : 'Something went wrong.'];
  const rest = [...error.formErrors];
  let placed = false;
  for (const [serverField, messages] of Object.entries(error.fieldErrors)) {
    // The API may name a field differently from the form (`cidr` for the form's `ip`).
    const field = options.aliases?.[serverField] ?? serverField;
    if (options.fields && !isKnownField(field, options.fields)) {
      rest.push(...messages.map((message) => `${field}: ${message}`));
      continue;
    }
    setError(
      field as FieldPath<T>,
      { type: 'server', message: messages.join(' ') },
      { shouldFocus: !placed },
    );
    placed = true;
  }
  if (!placed && rest.length === 0) rest.push(error.detail ?? error.title);
  return rest;
}
