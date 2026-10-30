// Tests for the tab list: the three tabs in the demo's order, and what the page accepts from the address.
import { describe, expect, it } from 'vitest';
import { COMMISSION_TABS, DEFAULT_TAB, isCommissionsTab } from './tabs';

describe('tabs', () => {
  it('are the demo’s three, in order, opening on Accruals', () => {
    expect(COMMISSION_TABS.map((tab) => tab.label)).toEqual(['Accruals', 'Agents', 'Plans']);
    expect(DEFAULT_TAB).toBe('accruals');
  });

  it('accept only their own ids from the address', () => {
    expect(isCommissionsTab('plans')).toBe(true);
    expect(isCommissionsTab('wallets')).toBe(false);
    expect(isCommissionsTab(null)).toBe(false);
  });
});
