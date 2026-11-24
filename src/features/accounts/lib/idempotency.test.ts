// Tests for the Idempotency-Key a dialog makes: its shape (what the server accepts) and that every opening gets its own.
import { describe, expect, it } from 'vitest';
import { newIdempotencyKey } from './idempotency';

describe('newIdempotencyKey', () => {
  it('makes a different key each time, in the characters the server accepts', () => {
    const first = newIdempotencyKey();
    expect(first).toMatch(/^[\x21-\x7e]{1,100}$/);
    expect(newIdempotencyKey()).not.toBe(first);
  });
});
