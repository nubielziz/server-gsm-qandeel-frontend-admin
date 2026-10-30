// Tests for the command palette's journal search, run against the dev mock API: it asks the server for up to five entries and
// each result opens the entry’s drawer on the Ledger tab.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { ledgerPaletteSource, PALETTE_JOURNAL_LIMIT } from './paletteSource';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

describe('ledgerPaletteSource', () => {
  it('finds entries by their memo, newest first, and opens the drawer of the one picked', async () => {
    const go = vi.fn();
    const items = await ledgerPaletteSource.search('Hold for ORD-48100', new AbortController().signal, go);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      label: 'JRN-00025  Hold for ORD-48100',
      hint: 'Order hold',
      icon: 'receipt',
    });
    items[0].run();
    expect(go).toHaveBeenCalledWith('/finance?journal=25');
  });

  it('lists at most five entries', async () => {
    const items = await ledgerPaletteSource.search('Hold', new AbortController().signal, vi.fn());
    expect(items).toHaveLength(PALETTE_JOURNAL_LIMIT);
  });

  it('needs the ledger permission', () => {
    expect(ledgerPaletteSource.permission).toBe('ledger:read');
  });
});
