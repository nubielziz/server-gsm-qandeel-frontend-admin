// Tests for the maintenance function: a PUT whose body is the whole switch (on with a scope and message, or off).
import { describe, expect, it } from 'vitest';
import { setMaintenance } from './maintenance';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('setMaintenance', () => {
  it('switches maintenance on with a scope, a message and an expected end', async () => {
    const body = {
      enabled: true as const,
      scope: 'checkout' as const,
      message: 'Back at 15:00.',
      expectedEndAt: '2026-10-31T15:00:00.000Z',
    };
    http.reply({ enabled: true, scope: 'checkout' });
    await expect(setMaintenance(body)).resolves.toEqual({ enabled: true, scope: 'checkout' });
    expect(http.last()).toEqual({ method: 'PUT', path: '/admin/system/maintenance', query: {}, body });
  });

  it('switches it off with a body of its own', async () => {
    await setMaintenance({ enabled: false });
    expect(http.last()).toEqual({
      method: 'PUT',
      path: '/admin/system/maintenance',
      query: {},
      body: { enabled: false },
    });
  });
});
