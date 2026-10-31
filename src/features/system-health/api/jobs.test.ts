// Tests for the scheduled job and webhook functions: the list (with an optional job history), a manual run, webhooks.
import { describe, expect, it } from 'vitest';
import { getJobs, getWebhooksHealth, runJob } from './jobs';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('getJobs', () => {
  it('lists the jobs with no query', async () => {
    http.reply({ jobs: [], runs: [] });
    await expect(getJobs()).resolves.toEqual({ jobs: [], runs: [] });
    expect(http.last()).toEqual({ method: 'GET', path: '/admin/system/jobs', query: {}, body: undefined });
  });

  it('asks for the history of one job', async () => {
    await getJobs({ job: 'price-sync' });
    expect(http.last().query).toEqual({ job: 'price-sync' });
  });
});

describe('runJob', () => {
  it('runs a job by name with a POST and no body', async () => {
    http.reply({ id: 31, status: 'running', trigger: 'manual' });
    await expect(runJob('price-sync')).resolves.toMatchObject({ trigger: 'manual' });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/jobs/price-sync/run',
      query: {},
      body: undefined,
    });
  });
});

describe('getWebhooksHealth', () => {
  it('reads webhook delivery with a plain GET', async () => {
    http.reply({ outgoing: {}, incoming: {} });
    await getWebhooksHealth();
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/webhooks',
      query: {},
      body: undefined,
    });
  });
});
