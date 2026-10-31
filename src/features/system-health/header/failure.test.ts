// Tests for failureOf: the title, detail and request id of a failed read.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { failureOf } from './failure';

describe('failureOf', () => {
  it('reads the title, detail and request id of an API error', () => {
    const error = new ApiError({
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      title: 'Database unavailable',
      detail: 'The database is not accepting connections.',
      requestId: 'req_8f2a',
    });
    expect(failureOf(error)).toEqual({
      title: 'Database unavailable',
      detail: 'The database is not accepting connections.',
      requestId: 'req_8f2a',
    });
  });

  it('gives a plain error as its message', () => {
    expect(failureOf(new Error('Network down'))).toEqual({ title: 'Network down' });
  });

  it('has a fallback for anything else', () => {
    expect(failureOf('boom')).toEqual({ title: 'Something went wrong' });
    expect(failureOf(null)).toEqual({ title: 'Something went wrong' });
  });
});
