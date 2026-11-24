// Tests for the reasons the Block dialog offers: exactly the four the server takes.
import { describe, expect, it } from 'vitest';
import { BLOCK_REASON_OPTIONS, BLOCK_REASONS } from './blockReasons';

describe('block reasons', () => {
  it('offers exactly the four reasons, after a prompt that is not a reason', () => {
    expect(BLOCK_REASONS).toEqual([
      'Chargeback or dispute',
      'Card testing or fraud',
      'Abuse of refunds',
      'Other',
    ]);
    expect(BLOCK_REASON_OPTIONS.map((option) => [option.value, option.label])).toEqual([
      ['', 'Choose a reason'],
      ['Chargeback or dispute', 'Chargeback or dispute'],
      ['Card testing or fraud', 'Card testing or fraud'],
      ['Abuse of refunds', 'Abuse of refunds'],
      ['Other', 'Other'],
    ]);
  });
});
