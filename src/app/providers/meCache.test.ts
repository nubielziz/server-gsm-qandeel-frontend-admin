// Tests for the `me` cache behind the auth and access providers (sharing, TTL, clearing).
import { describe, expect, it, vi } from 'vitest';
import type { Me } from '@/features/auth';
import { createMeCache } from './meCache';

function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    id: 1,
    email: 'rami@gsm-supply.example',
    name: 'Rami K.',
    status: 'active',
    role: { id: 1, name: 'Owner' },
    permissions: ['*'],
    twofaEnabled: true,
    mustChangePassword: false,
    lastLoginAt: null,
    lastLoginIp: null,
    ...overrides,
  };
}

describe('createMeCache', () => {
  it('serves the cached value until the TTL has passed', async () => {
    let now = 1000;
    const fetchMe = vi.fn(async () => makeMe());
    const cache = createMeCache(fetchMe, { ttlMs: 60_000, now: () => now });
    await cache.get();
    now += 59_999;
    await cache.get();
    expect(fetchMe).toHaveBeenCalledTimes(1);
    now += 2;
    await cache.get();
    expect(fetchMe).toHaveBeenCalledTimes(2);
  });

  it('lets concurrent callers share one request', async () => {
    const fetchMe = vi.fn(async () => makeMe());
    const cache = createMeCache(fetchMe);
    const [a, b] = await Promise.all([cache.get(), cache.get()]);
    expect(a).toBe(b);
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });

  it('peek returns the last value without a request', async () => {
    const fetchMe = vi.fn(async () => makeMe());
    const cache = createMeCache(fetchMe);
    expect(cache.peek()).toBeUndefined();
    await cache.get();
    expect(cache.peek()?.name).toBe('Rami K.');
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });

  it('forgets the value on clear', async () => {
    const fetchMe = vi.fn(async () => makeMe());
    const cache = createMeCache(fetchMe);
    await cache.get();
    cache.clear();
    expect(cache.peek()).toBeUndefined();
    await cache.get();
    expect(fetchMe).toHaveBeenCalledTimes(2);
  });

  it('does not store an answer that arrives after clear', async () => {
    let release: (me: Me) => void = () => {};
    const fetchMe = vi.fn(() => new Promise<Me>((resolve) => (release = resolve)));
    const cache = createMeCache(fetchMe);
    const pending = cache.get();
    cache.clear();
    release(makeMe());
    await pending;
    expect(cache.peek()).toBeUndefined();
  });

  it('does not cache a failure, so the next call tries again', async () => {
    const fetchMe = vi
      .fn<() => Promise<Me>>()
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValue(makeMe());
    const cache = createMeCache(fetchMe);
    await expect(cache.get()).rejects.toThrow('401');
    await expect(cache.get()).resolves.toMatchObject({ id: 1 });
    expect(fetchMe).toHaveBeenCalledTimes(2);
  });
});
