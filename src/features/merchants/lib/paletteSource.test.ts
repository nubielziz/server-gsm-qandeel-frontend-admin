// Tests for the command palette's merchant search, run against the dev mock API: what a result says, how many there are, and where it goes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { merchantsPaletteSource, PALETTE_MERCHANT_LIMIT } from './paletteSource';

setupMockApi();
installMerchantMocks();
beforeEach(async () => {
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  merchantsPaletteSource.search(query, new AbortController().signal, go);

describe('merchantsPaletteSource', () => {
  it('needs clients:read and sits under the Merchants heading', () => {
    expect(merchantsPaletteSource).toMatchObject({
      id: 'merchants',
      group: 'Merchants',
      permission: 'clients:read',
    });
  });

  it('finds a merchant by name, with the email as the hint', async () => {
    const hits = await search('zain');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: 'merchant:1',
      label: 'Zain Mobile Hub',
      hint: 'ops@zainmobilehub.example',
      icon: 'users',
    });
  });

  it('finds a merchant by email', async () => {
    const hits = await search('  KARACHIUNLOCKH ');
    expect(hits.map((hit) => hit.label)).toEqual(['Karachi Unlock Hub']);
  });

  it('opens the merchant’s page', async () => {
    const go = vi.fn();
    const [hit] = await search('tunis', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/merchants/19');
  });

  it('lists at most five merchants, in alphabetical order', async () => {
    const hits = await search('example');
    expect(hits).toHaveLength(PALETTE_MERCHANT_LIMIT);
    const labels = hits.map((hit) => hit.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});
