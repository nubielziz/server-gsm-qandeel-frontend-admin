// Tests for the command palette's customer search, run against the dev mock API: what a result says, how many there are, and
// where it goes.
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { customersPaletteSource, PALETTE_CUSTOMER_LIMIT } from './paletteSource';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  customersPaletteSource.search(query, new AbortController().signal, go);

describe('customersPaletteSource', () => {
  it('needs customers:read and sits under the Customers heading', () => {
    expect(customersPaletteSource).toMatchObject({
      id: 'customers',
      group: 'Customers',
      permission: 'customers:read',
    });
  });

  it('finds a customer by name, with the country as the hint', async () => {
    const hits = await search('whitmore');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: 'customer:1',
      label: 'Daniel Whitmore',
      hint: 'United Kingdom',
      icon: 'user',
    });
  });

  it('finds a customer by email', async () => {
    const hits = await search('sofia.alvarez@');
    expect(hits.map((hit) => hit.label)).toEqual(['Sofia Alvarez']);
  });

  it('opens the customer’s page', async () => {
    const go = vi.fn();
    const [hit] = await search('whitmore', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/customers/1');
  });

  it('lists at most four customers', async () => {
    const hits = await search('example');
    expect(hits).toHaveLength(PALETTE_CUSTOMER_LIMIT);
  });

  it('asks for the first four matches in the server’s own order, with no sort', async () => {
    const urls: URL[] = [];
    mockServer.use(
      http.get('*/admin/customers', ({ request }) => {
        urls.push(new URL(request.url));
        return undefined;
      }),
    );
    await search('  whitmore ');
    expect(urls).toHaveLength(1);
    const params = urls[0].searchParams;
    expect(params.get('q')).toBe('whitmore');
    expect(params.get('_start')).toBe('0');
    expect(params.get('_end')).toBe('4');
    expect(params.has('_sort')).toBe(false);
    expect(params.has('_order')).toBe(false);
  });

  it('finds nobody for text that matches nobody', async () => {
    expect(await search('zzzzzz')).toEqual([]);
  });
});
