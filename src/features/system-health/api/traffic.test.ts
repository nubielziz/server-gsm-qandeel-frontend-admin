// Tests for the API traffic and error functions: the method, path and query each one sends.
import { describe, expect, it } from 'vitest';
import { stubFetch } from '../test/stubFetch';
import { getApiErrors, getApiMetrics } from './traffic';

const http = stubFetch();

describe('getApiMetrics', () => {
  it('sends the range', async () => {
    http.reply({ range: '6h', surfaces: [] });
    await expect(getApiMetrics({ range: '6h' })).resolves.toEqual({ range: '6h', surfaces: [] });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/metrics',
      query: { range: '6h' },
      body: undefined,
    });
  });

  it('narrows to one surface', async () => {
    await getApiMetrics({ range: '1h', surface: 'dhru' });
    expect(http.last().query).toEqual({ range: '1h', surface: 'dhru' });
  });
});

describe('getApiErrors', () => {
  it('sends the range', async () => {
    http.reply({ range: '24h', total: 0, groups: [] });
    await getApiErrors({ range: '24h' });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/errors',
      query: { range: '24h' },
      body: undefined,
    });
  });

  it('narrows to one surface', async () => {
    await getApiErrors({ range: '7d', surface: 'v1' });
    expect(http.last().query).toEqual({ range: '7d', surface: 'v1' });
  });
});
