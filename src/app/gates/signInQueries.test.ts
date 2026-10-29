// Tests for keepForSignIn: which cached queries survive arriving on a sign-in screen.
import type { Query } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { keepForSignIn } from './signInQueries';

function query(queryKey: unknown[], fetchStatus: 'fetching' | 'idle' = 'idle') {
  return { queryKey, state: { fetchStatus } } as unknown as Pick<Query, 'queryKey' | 'state'>;
}

describe('keepForSignIn', () => {
  it('keeps the "signed in?" check the sign-in area is watching', () => {
    expect(keepForSignIn(query(['auth', 'check']))).toBe(true);
  });

  it('keeps a sign-in call still in flight (the 2FA setup started by the page before this ran)', () => {
    expect(keepForSignIn(query(['api', 'auth', '2fa-setup'], 'fetching'))).toBe(true);
  });

  it('drops finished sign-in calls, the old identity and every page query', () => {
    expect(keepForSignIn(query(['api', 'auth', '2fa-setup']))).toBe(false);
    expect(keepForSignIn(query(['auth', 'identity']))).toBe(false);
    expect(keepForSignIn(query(['default', 'orders', 'list']))).toBe(false);
  });
});
