// Tests for the words, the square and the filter of the status of a stored code.
import { describe, expect, it } from 'vitest';
import { parseStockStatus, statusFilterOptions, STOCK_STATUSES, stockTone, stockWord } from './stockStatus';

describe('the status of a stored code', () => {
  it('lists the four statuses in the order of the counts', () => {
    expect(STOCK_STATUSES).toEqual(['available', 'reserved', 'sold', 'void']);
  });

  it('has a word and a different square for each status', () => {
    expect(STOCK_STATUSES.map(stockWord)).toEqual(['Available', 'Reserved', 'Sold', 'Void']);
    expect(STOCK_STATUSES.map(stockTone)).toEqual(['ok', 'warn', 'off', 'crit']);
  });

  it('offers every status and all of them in the filter, and reads the value back', () => {
    expect(statusFilterOptions()).toEqual([
      { value: '', label: 'All statuses' },
      { value: 'available', label: 'Available' },
      { value: 'reserved', label: 'Reserved' },
      { value: 'sold', label: 'Sold' },
      { value: 'void', label: 'Void' },
    ]);
    expect(parseStockStatus('sold')).toBe('sold');
    expect(parseStockStatus('')).toBe('');
    expect(parseStockStatus('anything else')).toBe('');
  });
});
