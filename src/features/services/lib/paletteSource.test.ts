// Tests for the command palette's service search, run against the dev mock API: what a result says, how many there are, and where it goes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { PALETTE_SERVICE_LIMIT, servicesPaletteSource } from './paletteSource';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  servicesPaletteSource.search(query, new AbortController().signal, go);

describe('servicesPaletteSource', () => {
  it('needs catalog:read and sits under the Services heading', () => {
    expect(servicesPaletteSource).toMatchObject({
      id: 'services',
      group: 'Services',
      permission: 'catalog:read',
    });
  });

  it('finds a service by name, with the code as the hint', async () => {
    const [hit] = await search('Chimera');
    expect(hit).toMatchObject({
      id: 'service:17',
      label: 'Chimera Tool 1 Month',
      hint: 'SRV-CHM-1M',
      icon: 'tag',
    });
  });

  it('finds a service by its code', async () => {
    const hits = await search('IMEI-ATT');
    expect(hits.map((hit) => hit.label)).toEqual(['AT&T USA Premier Unlock']);
  });

  it('opens the Services tab filtered by that service’s name', async () => {
    const go = vi.fn();
    const [hit] = await search('Chimera', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/services?q=Chimera+Tool+1+Month');
  });

  it('lists at most five services, A to Z', async () => {
    const hits = await search('unlock');
    expect(hits).toHaveLength(PALETTE_SERVICE_LIMIT);
    expect(hits.map((hit) => hit.label)).toEqual(
      [...hits.map((hit) => hit.label)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('gives nothing when no service matches', async () => {
    expect(await search('zzzz-nothing')).toEqual([]);
  });
});
