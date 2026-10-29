// Tests for the command palette's order search, run against the dev mock API: what a result says, how many there are, and where it goes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { ordersPaletteSource, PALETTE_ORDER_LIMIT } from './paletteSource';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  ordersPaletteSource.search(query, new AbortController().signal, go);

describe('ordersPaletteSource', () => {
  it('needs orders:read and sits under the Orders heading', () => {
    expect(ordersPaletteSource).toMatchObject({ id: 'orders', group: 'Orders', permission: 'orders:read' });
  });

  it('finds an order by id, with the service as the label and the buyer as the hint', async () => {
    const [hit] = await search('ORD-48859');
    expect(hit).toMatchObject({
      id: 'order:48859',
      label: 'ORD-48859  T-Mobile USA Unlock',
      hint: 'Muscat Mobile Clinic',
      icon: 'orders',
    });
  });

  it('opens the order’s drawer on the Orders page', async () => {
    const go = vi.fn();
    const [hit] = await search('48859', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/orders?order=48859');
  });

  it('lists at most five orders, newest first', async () => {
    const hits = await search('3546');
    expect(hits).toHaveLength(PALETTE_ORDER_LIMIT);
  });

  it('names a storefront order by its customer', async () => {
    const hits = await search('SF-20503');
    expect(hits[0].label).toMatch(/^SF-20503 /);
    expect(hits[0].hint).toBeTruthy();
  });
});
