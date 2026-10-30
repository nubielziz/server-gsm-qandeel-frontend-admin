// Tests for the command palette's supplier search, run against the feature's mock API: what a result says, how many there are
// and where it goes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { mocks } from '../mocks';
import { suppliersPaletteSource } from './paletteSource';

setupMockApi();
beforeEach(async () => {
  mockServer.use(...mocks.handlers);
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  suppliersPaletteSource.search(query, new AbortController().signal, go);

describe('suppliersPaletteSource', () => {
  it('needs suppliers:read and sits under the Suppliers heading', () => {
    expect(suppliersPaletteSource).toMatchObject({
      id: 'suppliers',
      group: 'Suppliers',
      permission: 'suppliers:read',
    });
  });

  it('finds a supplier by part of its name, with the API type and state as the hint', async () => {
    const hits = await search('rapid');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: 'supplier:3',
      label: 'Rapid IMEI',
      hint: 'REST v2 · Degraded',
      icon: 'server',
    });
  });

  it('opens the Suppliers page with that supplier selected', async () => {
    const go = vi.fn();
    const [hit] = await search('nordic', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/suppliers?supplier=1');
  });

  it('lists at most five suppliers, A to Z', async () => {
    const hits = await search('e');
    expect(hits.length).toBeLessThanOrEqual(5);
    const labels = hits.map((hit) => hit.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});
