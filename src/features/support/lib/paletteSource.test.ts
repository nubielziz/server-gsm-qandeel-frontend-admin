// Tests for the command palette's ticket search, run against the dev mock API: what a result says, how many there are, and where
// it goes.
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { PALETTE_TICKET_LIMIT, supportPaletteSource } from './paletteSource';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const search = (query: string, go = vi.fn()) =>
  supportPaletteSource.search(query, new AbortController().signal, go);

describe('supportPaletteSource', () => {
  it('needs support:read and sits under the Tickets heading', () => {
    expect(supportPaletteSource).toMatchObject({
      id: 'support',
      group: 'Tickets',
      permission: 'support:read',
    });
  });

  it('finds a ticket by its number, with the number and subject as the label and the requester as the hint', async () => {
    const hits = await search('T-4212');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      id: 'ticket:4212',
      label: 'T-4212  Chargeback warning from my bank',
      hint: 'Jack Turner',
      icon: 'life',
    });
  });

  it('finds tickets by subject', async () => {
    const hits = await search('invoice');
    expect(hits.map((hit) => hit.label)).toEqual(['T-4208  VAT invoice for SF-20421']);
  });

  it('opens the ticket’s thread on All, so it shows whatever its status', async () => {
    const go = vi.fn();
    const [hit] = await search('T-4208', go);
    hit.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/support?ticket=4208&filter=all');
  });

  it('lists at most three tickets, the most recently active first', async () => {
    const hits = await search('SF-');
    expect(hits).toHaveLength(PALETTE_TICKET_LIMIT);
    expect(hits[0].id).toBe('ticket:4202');
  });

  it('asks for the first three matches, newest activity first', async () => {
    const urls: URL[] = [];
    mockServer.use(
      http.get('*/admin/support-tickets', ({ request }) => {
        urls.push(new URL(request.url));
        return undefined;
      }),
    );
    await search(' refund ');
    const params = urls[0].searchParams;
    expect(params.get('q')).toBe('refund');
    expect(params.get('_start')).toBe('0');
    expect(params.get('_end')).toBe('3');
    expect(params.get('_sort')).toBe('updatedAt');
    expect(params.get('_order')).toBe('desc');
  });
});
