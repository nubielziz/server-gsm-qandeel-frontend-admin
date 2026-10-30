// Tests for describeAuthError: sign-in errors turned into the text the screens show.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { blockedKindOf, describeAuthError, mapSetPasswordError, splitFieldError } from './authErrors';

describe('describeAuthError', () => {
  it("shows the server's title, detail and request ID", () => {
    const error = new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      title: 'Sign-in failed',
      detail: 'The email or password is not correct.',
      requestId: 'req-1',
    });
    expect(describeAuthError(error)).toEqual({
      title: 'Sign-in failed',
      detail: 'The email or password is not correct.',
      requestId: 'req-1',
    });
  });

  it('says how long a rate-limited user must wait', () => {
    const error = new ApiError({
      status: 429,
      code: 'RATE_LIMITED',
      title: 'Too many requests',
      retryAfter: 90,
    });
    expect(describeAuthError(error)).toMatchObject({
      title: 'Too many requests',
      detail: 'Too many requests. Try again in 90 seconds.',
    });
    const long = new ApiError({ status: 429, title: 'Too many requests', retryAfter: 600 });
    expect(describeAuthError(long).detail).toBe('Too many requests. Try again in 10 minutes.');
  });

  it('says "a moment" when the server gave no wait time', () => {
    const error = new ApiError({ status: 429, title: 'Slow down' });
    expect(describeAuthError(error).detail).toBe('Too many requests. Try again in a moment.');
  });

  it('handles errors that are not ApiError', () => {
    expect(describeAuthError(new Error('boom'))).toEqual({ title: 'Something went wrong', detail: 'boom' });
    expect(describeAuthError('text')).toEqual({ title: 'Something went wrong', detail: undefined });
  });
});

describe('splitFieldError', () => {
  it('puts the message of the named field under that field', () => {
    const error = new ApiError({ status: 422, fieldErrors: { code: ['Wrong code.', 'Try again.'] } });
    expect(splitFieldError(error, 'code')).toEqual({ field: 'Wrong code. Try again.' });
  });

  it('sends everything else to the banner', () => {
    const error = new ApiError({ status: 401, title: 'Not signed in', detail: 'Sign in to continue.' });
    expect(splitFieldError(error, 'code')).toEqual({
      banner: { title: 'Not signed in', detail: 'Sign in to continue.', requestId: undefined },
    });
    const other = new ApiError({ status: 422, fieldErrors: { email: ['Bad.'] }, title: 'Check the form' });
    expect(splitFieldError(other, 'code').banner?.title).toBe('Check the form');
  });
});

describe('mapSetPasswordError', () => {
  it('treats a dead link (TOKEN_INVALID) as a page message, not a field error', () => {
    const error = new ApiError({
      status: 410,
      code: 'TOKEN_INVALID',
      title: 'Link no longer valid',
      detail: 'This link has expired or was already used.',
    });
    expect(mapSetPasswordError(error)).toEqual({
      kind: 'token',
      info: {
        title: 'Link no longer valid',
        detail: 'This link has expired or was already used.',
        requestId: undefined,
      },
    });
  });

  it('puts a weak-password message on the password field', () => {
    const withField = new ApiError({
      status: 422,
      code: 'WEAK_PASSWORD',
      title: 'Password too weak',
      detail: 'Too common.',
      fieldErrors: { password: ['Use at least 10 characters.'] },
    });
    expect(mapSetPasswordError(withField)).toEqual({
      kind: 'password',
      message: 'Use at least 10 characters.',
    });

    // The server may send only the code and a detail.
    const noField = new ApiError({
      status: 422,
      code: 'WEAK_PASSWORD',
      title: 'Password too weak',
      detail: 'Too common.',
    });
    expect(mapSetPasswordError(noField)).toEqual({ kind: 'password', message: 'Too common.' });
    const noDetail = new ApiError({ status: 422, code: 'WEAK_PASSWORD', title: 'Password too weak' });
    expect(mapSetPasswordError(noDetail)).toEqual({ kind: 'password', message: 'Password too weak' });
  });

  it('also uses any message the server attaches to the password field, whatever the code', () => {
    const error = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      fieldErrors: { password: ['Required.'] },
    });
    expect(mapSetPasswordError(error)).toEqual({ kind: 'password', message: 'Required.' });
  });

  it('keeps everything else as a general message', () => {
    const notSignedIn = new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      title: 'Not signed in',
      detail: 'Sign in.',
    });
    expect(mapSetPasswordError(notSignedIn)).toMatchObject({
      kind: 'general',
      info: { title: 'Not signed in' },
    });
    expect(mapSetPasswordError(new Error('offline'))).toMatchObject({ kind: 'general' });
  });
});

describe('blockedKindOf', () => {
  it('names the screen for a suspended account and for a blocked address', () => {
    expect(blockedKindOf(new ApiError({ status: 403, code: 'ACCOUNT_SUSPENDED' }))).toBe('suspended');
    expect(blockedKindOf(new ApiError({ status: 403, code: 'IP_NOT_ALLOWED' }))).toBe('ip');
  });

  it('leaves every other failure to the banner', () => {
    expect(blockedKindOf(new ApiError({ status: 401, code: 'UNAUTHORIZED' }))).toBeUndefined();
    expect(blockedKindOf(new ApiError({ status: 403, code: 'FORBIDDEN' }))).toBeUndefined();
    expect(blockedKindOf(new Error('offline'))).toBeUndefined();
  });
});
