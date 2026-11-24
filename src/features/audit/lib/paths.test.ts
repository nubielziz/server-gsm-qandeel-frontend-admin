// Tests for the address other pages use to open the Audit log on one account.
import { describe, expect, it } from 'vitest';
import { auditAccountPath } from './paths';
import { parseView, toFilters } from './view';

describe('auditAccountPath', () => {
  it('names the record type and the account number', () => {
    expect(auditAccountPath(7)).toBe('/audit?type=account&record=7');
  });

  it('is read back by the page as the account filter', () => {
    const query = auditAccountPath(7).split('?')[1];
    expect(toFilters(parseView(new URLSearchParams(query)))).toEqual({ accountId: 7 });
  });
});
