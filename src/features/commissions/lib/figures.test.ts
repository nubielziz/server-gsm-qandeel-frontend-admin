// Tests for the header strip: the 30-day window and the four cells, which show server counts and dashes, never an added-up amount.
import { describe, expect, it } from 'vitest';
import { stripCells, windowStart } from './figures';

describe('windowStart', () => {
  it('is 30 whole days back, rounded down to midnight UTC so the query key holds all day', () => {
    const noon = Date.parse('2026-03-31T12:34:56.000Z');
    expect(windowStart(noon)).toBe('2026-03-01T00:00:00.000Z');
    expect(windowStart(noon + 3_600_000)).toBe(windowStart(noon));
  });
});

describe('stripCells', () => {
  it('words the four cells like the demo, with a dash for every amount and for the share', () => {
    const cells = stripCells({ ready: 49, approved30: 112 });
    expect(cells.map((cell) => [cell.label, cell.value])).toEqual([
      ['Ready to approve', '–'],
      ['Approved, 30 days', '–'],
      ['Earned, 30 days', '–'],
      ['Share of revenue', '–'],
    ]);
  });

  it('shows the server’s counts under the cells that have one', () => {
    const [ready, approved, earned, share] = stripCells({ ready: 49, approved30: 1234 });
    expect(ready.sub).toBe('49 accruals');
    expect(approved.sub).toBe('1,234 accruals paid into wallets');
    expect(earned.sub).toBe('Approved plus waiting');
    expect(share.sub).toBe('Commission as % of the referred merchants’ 30-day order revenue');
  });

  it('counts in the singular and says nothing while a count has not arrived', () => {
    const [ready, approved] = stripCells({ ready: 1, approved30: undefined });
    expect(ready.sub).toBe('1 accrual');
    expect(approved.sub).toBeUndefined();
    expect(stripCells({ ready: undefined, approved30: 0 })[0].sub).toBeUndefined();
    expect(stripCells({ ready: 0, approved30: 0 })[1].sub).toBe('0 accruals paid into wallets');
  });
});
