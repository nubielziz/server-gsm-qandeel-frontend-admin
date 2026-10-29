// Tests for problem+json parsing into ApiError and for applyServerErrors.
import type { UseFormSetError } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  ERROR_CODES,
  applyServerErrors,
  fieldPath,
  isAbortError,
  isApiError,
  networkError,
  parseErrorResponse,
} from './errors';

function problemResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 422,
    headers: { 'Content-Type': 'application/problem+json' },
    ...init,
  });
}

describe('parseErrorResponse', () => {
  it('reads a problem+json body and the request id', async () => {
    const error = await parseErrorResponse(
      problemResponse(
        {
          type: 'https://errors.example/validation',
          title: 'Check the form',
          status: 422,
          code: 'VALIDATION_FAILED',
          detail: 'Some fields are invalid.',
          errors: [{ field: 'email', message: 'Not an email.' }],
        },
        { headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': 'req-42' } },
      ),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      statusCode: 422,
      code: 'VALIDATION_FAILED',
      title: 'Check the form',
      detail: 'Some fields are invalid.',
      type: 'https://errors.example/validation',
      requestId: 'req-42',
      message: 'Some fields are invalid.',
      fieldErrors: { email: ['Not an email.'] },
    });
    expect(error.errors).toEqual(error.fieldErrors);
  });

  it('accepts every field key and path style in errors[]', async () => {
    const error = await parseErrorResponse(
      problemResponse({
        errors: [
          { field: 'a', message: 'one' },
          { path: 'body.b', message: 'two' },
          { pointer: '/c/d', detail: 'three' },
          { pointer: '#/e', title: 'four' },
          { name: 'f', code: 'FIVE' },
          { param: 'g[0].h', message: 'six' },
          { path: ['body', 'i', 0, 'j'], message: 'seven' },
          { field: 'a', message: 'again' },
        ],
      }),
    );
    expect(error.fieldErrors).toEqual({
      a: ['one', 'again'],
      b: ['two'],
      'c.d': ['three'],
      e: ['four'],
      f: ['FIVE'],
      'g.0.h': ['six'],
      'i.0.j': ['seven'],
    });
  });

  it('keeps messages without a field as form errors', async () => {
    const error = await parseErrorResponse(
      problemResponse({ errors: ['Something general', { message: 'Also general' }, { field: 'x' }, 42] }),
    );
    expect(error.fieldErrors).toEqual({});
    expect(error.formErrors).toEqual(['Something general', 'Also general']);
  });

  it('understands an errors object keyed by field', async () => {
    const error = await parseErrorResponse(
      problemResponse({ errors: { email: ['bad', 'worse'], name: 'missing', age: { message: 'too low' } } }),
    );
    expect(error.fieldErrors).toEqual({ email: ['bad', 'worse'], name: ['missing'], age: ['too low'] });
  });

  it('falls back to HTTP_<status> and the status text when the body says nothing', async () => {
    const error = await parseErrorResponse(new Response('', { status: 500, statusText: 'Server Error' }));
    expect(error).toMatchObject({ status: 500, code: 'HTTP_500', title: 'Server Error' });
    expect(error.detail).toBeUndefined();
  });

  it('uses a short plain-text body as the detail but ignores an HTML page', async () => {
    const text = await parseErrorResponse(new Response('Upstream timed out', { status: 504 }));
    expect(text.detail).toBe('Upstream timed out');
    const html = await parseErrorResponse(
      new Response('<html><body>Bad gateway</body></html>', { status: 502 }),
    );
    expect(html.detail).toBeUndefined();
    expect(html.message).toBe('Request failed (HTTP 502)');
  });

  it('reads Retry-After as seconds or as an HTTP date', async () => {
    const seconds = await parseErrorResponse(
      problemResponse({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '30' } }),
    );
    expect(seconds.retryAfter).toBe(30);
    const when = new Date(Date.now() + 90_000).toUTCString();
    const date = await parseErrorResponse(
      problemResponse({}, { status: 429, headers: { 'Retry-After': when } }),
    );
    expect(date.retryAfter).toBeGreaterThan(85);
    expect(date.retryAfter).toBeLessThanOrEqual(90);
    const none = await parseErrorResponse(problemResponse({}, { status: 429 }));
    expect(none.retryAfter).toBeUndefined();
  });

  it('survives a body that is not JSON but looks like it', async () => {
    const error = await parseErrorResponse(new Response('{oops', { status: 400 }));
    expect(error.status).toBe(400);
    expect(error.code).toBe('HTTP_400');
  });
});

describe('fieldPath', () => {
  it.each([
    ['email', 'email'],
    ['/a/b', 'a.b'],
    ['#/a', 'a'],
    ['#/body/email', 'email'],
    ['body.a', 'a'],
    ['body', 'body'],
    ['$.name', 'name'],
    ['items[2].price', 'items.2.price'],
    ['/a~1b/c~0d', 'a/b.c~d'],
    ['', undefined],
    ['/', undefined],
    [undefined, undefined],
    [['body', 'x'], 'x'],
  ])('%j -> %j', (input, expected) => {
    expect(fieldPath(input)).toBe(expected);
  });
});

describe('error helpers', () => {
  it('networkError has status 0 and the NETWORK_ERROR code', () => {
    const cause = new TypeError('Failed to fetch');
    const error = networkError(cause);
    expect(error).toMatchObject({ status: 0, code: ERROR_CODES.NETWORK_ERROR });
    expect(error.cause).toBe(cause);
  });

  it('isApiError only accepts ApiError instances', () => {
    expect(isApiError(networkError())).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError({ status: 500 })).toBe(false);
  });

  it('isAbortError recognises an AbortError by name', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('applyServerErrors', () => {
  type Form = { email: string; name: string };

  function setup(error: ApiError, fields?: string[]) {
    const setError = vi.fn();
    const rest = applyServerErrors<Form>(error, setError as unknown as UseFormSetError<Form>, { fields });
    return { setError, rest };
  }

  it('sets each field error and focuses only the first', () => {
    const error = new ApiError({
      status: 422,
      fieldErrors: { email: ['Taken.', 'Also bad.'], name: ['Required.'] },
    });
    const { setError, rest } = setup(error);
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'email',
      { type: 'server', message: 'Taken. Also bad.' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'name',
      { type: 'server', message: 'Required.' },
      { shouldFocus: false },
    );
    expect(rest).toEqual([]);
  });

  it('returns messages it could not place', () => {
    const error = new ApiError({
      status: 422,
      fieldErrors: { email: ['Taken.'], ghost: ['Nope.'] },
      formErrors: ['General problem.'],
    });
    const { setError, rest } = setup(error, ['email', 'name']);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(rest).toEqual(['General problem.', 'ghost: Nope.']);
  });

  it('places errors of nested fields under a known parent', () => {
    const error = new ApiError({ status: 422, fieldErrors: { 'items.0.name': ['Required.'] } });
    const { setError, rest } = setup(error, ['items']);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(rest).toEqual([]);
  });

  it('returns the detail when the error carries no field messages', () => {
    const error = new ApiError({ status: 409, title: 'Conflict', detail: 'You cannot suspend yourself.' });
    const { setError, rest } = setup(error);
    expect(setError).not.toHaveBeenCalled();
    expect(rest).toEqual(['You cannot suspend yourself.']);
  });

  it('falls back to the title, and handles errors that are not ApiErrors', () => {
    expect(setup(new ApiError({ status: 500, title: 'Boom' })).rest).toEqual(['Boom']);
    const setError = vi.fn() as unknown as UseFormSetError<Form>;
    expect(applyServerErrors(new Error('plain'), setError)).toEqual(['plain']);
    expect(applyServerErrors('nope', setError)).toEqual(['Something went wrong.']);
  });
});
