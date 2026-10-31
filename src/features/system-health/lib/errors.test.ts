// Tests for errors.ts: which failures a card shows as "forbidden".
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { isForbiddenError } from './errors';

describe('isForbiddenError', () => {
  it('is true only for a 403', () => {
    expect(isForbiddenError(new ApiError({ status: 403, code: 'FORBIDDEN' }))).toBe(true);
    expect(isForbiddenError(new ApiError({ status: 401 }))).toBe(false);
    expect(isForbiddenError(new ApiError({ status: 503 }))).toBe(false);
  });

  it('is false for values that are not API errors', () => {
    expect(isForbiddenError(new Error('boom'))).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
    expect(isForbiddenError(undefined)).toBe(false);
  });
});
