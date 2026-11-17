// Tests for the sync toast's second line: cost changes, adopted services and the balance.
import { describe, expect, it } from 'vitest';
import type { SyncResult } from '../types';
import { syncSummary } from './sync';

const result = (changes: Partial<SyncResult> = {}): SyncResult => ({
  services: 17,
  added: 0,
  changed: 0,
  removed: 0,
  adopted: 0,
  balance: '1850.0000',
  balanceCheckedAt: '2026-11-17T18:00:00.000Z',
  ...changes,
});

describe('syncSummary', () => {
  it('says the cost changes and the balance', () => {
    expect(syncSummary(result())).toBe('No cost changes. Balance $1,850.00.');
    expect(syncSummary(result({ changed: 3 }))).toBe('3 with a changed cost. Balance $1,850.00.');
  });

  it('says how many services now ask for the supplier’s own input', () => {
    expect(syncSummary(result({ adopted: 1 }))).toBe(
      'No cost changes. 1 service now asks for the supplier’s own input (an ECID or a serial number) instead of an IMEI. Balance $1,850.00.',
    );
    expect(syncSummary(result({ changed: 2, adopted: 335 }))).toBe(
      '2 with a changed cost. 335 services now ask for the supplier’s own input (an ECID or a serial number) instead of an IMEI. Balance $1,850.00.',
    );
  });

  it('reads an answer without the count (an older backend) as nothing adopted', () => {
    const { adopted: _adopted, ...older } = result({ changed: 1 });
    expect(syncSummary(older as SyncResult)).toBe('1 with a changed cost. Balance $1,850.00.');
  });
});
