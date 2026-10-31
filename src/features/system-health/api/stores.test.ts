// Tests for the Postgres and Redis functions: the method and path each one sends.
import { describe, expect, it } from 'vitest';
import { stubFetch } from '../test/stubFetch';
import { getCacheHealth, getDatabaseHealth } from './stores';

const http = stubFetch();

describe('getDatabaseHealth', () => {
  it('reads Postgres with a plain GET', async () => {
    http.reply({ status: 'ok' });
    await expect(getDatabaseHealth()).resolves.toEqual({ status: 'ok' });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/database',
      query: {},
      body: undefined,
    });
  });
});

describe('getCacheHealth', () => {
  it('reads Redis with a plain GET', async () => {
    http.reply({ status: 'ok' });
    await expect(getCacheHealth()).resolves.toEqual({ status: 'ok' });
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/system/cache', query: {}, body: undefined });
  });
});
