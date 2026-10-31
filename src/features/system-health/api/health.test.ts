// Tests for the health summary and check history functions: the method, path and query each one sends.
import { describe, expect, it } from 'vitest';
import { getChecks, getSystemHealth } from './health';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('getSystemHealth', () => {
  it('reads the summary with a plain GET and returns the answer', async () => {
    http.reply({ status: 'degraded' });
    await expect(getSystemHealth()).resolves.toEqual({ status: 'degraded' });
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/system/health', query: {}, body: undefined });
  });
});

describe('getChecks', () => {
  it('sends the range for every component', async () => {
    http.reply({ range: '24h', components: [] });
    await getChecks({ range: '24h' });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/checks',
      query: { range: '24h' },
      body: undefined,
    });
  });

  it('adds the component when one is picked', async () => {
    await getChecks({ range: '7d', component: 'supplier:3' });
    expect(http.last().query).toEqual({ range: '7d', component: 'supplier:3' });
  });
});
