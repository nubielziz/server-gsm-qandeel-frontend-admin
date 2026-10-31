// Tests for the integrity functions: the report is a GET, the run is a POST with no body.
import { describe, expect, it } from 'vitest';
import { getIntegrity, runIntegrityCheck } from './integrity';
import { stubFetch } from '../test/stubFetch';

const http = stubFetch();

describe('getIntegrity', () => {
  it('reads the report with a plain GET', async () => {
    http.reply({ running: false, checks: [] });
    await expect(getIntegrity()).resolves.toEqual({ running: false, checks: [] });
    expect(http.last()).toEqual({
      method: 'GET',
      path: '/admin/system/integrity',
      query: {},
      body: undefined,
    });
  });
});

describe('runIntegrityCheck', () => {
  it('starts a run with a POST and no body', async () => {
    http.reply({ id: 9, status: 'running' });
    await expect(runIntegrityCheck()).resolves.toEqual({ id: 9, status: 'running' });
    expect(http.last()).toEqual({
      method: 'POST',
      path: '/admin/system/integrity/run',
      query: {},
      body: undefined,
    });
  });
});
