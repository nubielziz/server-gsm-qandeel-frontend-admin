// Tests for the words of a refused reused key: which error it recognises, that only the detail changes, and that the plain sentence says nothing
// was posted twice and tells the person to close the window, never to try again with a new key.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { isKeyReused, KEY_REUSED_CODE, KEY_REUSED_WORDS, withKeyReusedWords } from './keyReuse';

const reused = () =>
  new ApiError({
    status: 409,
    code: KEY_REUSED_CODE,
    title: 'This idempotency key was already used with a different request.',
    detail: 'This idempotency key was already used with a different request.',
    requestId: 'req-7',
  });

describe('isKeyReused', () => {
  it('recognises the server’s code and nothing else', () => {
    expect(isKeyReused(reused())).toBe(true);
    expect(isKeyReused(new ApiError({ status: 409, code: 'CONFLICT' }))).toBe(false);
    expect(isKeyReused(new Error(KEY_REUSED_CODE))).toBe(false);
    expect(isKeyReused(undefined)).toBe(false);
  });
});

describe('withKeyReusedWords', () => {
  it('replaces the detail only, so a report can still quote the code and the request', () => {
    const worded = withKeyReusedWords(reused());
    expect(worded).toBeInstanceOf(ApiError);
    expect(worded).toMatchObject({
      status: 409,
      code: KEY_REUSED_CODE,
      requestId: 'req-7',
      detail: KEY_REUSED_WORDS,
      message: KEY_REUSED_WORDS,
    });
  });

  it('says nothing was posted twice and to close the window, and never suggests a new key', () => {
    expect(KEY_REUSED_WORDS).toMatch(/already applied/);
    expect(KEY_REUSED_WORDS).toMatch(/nothing was posted twice/);
    expect(KEY_REUSED_WORDS).toMatch(/Close this window/);
    expect(KEY_REUSED_WORDS).not.toMatch(/idempotency|new key|retry/i);
  });
});
