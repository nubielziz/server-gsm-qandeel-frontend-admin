// Tests for the number a data request is known by.
import { describe, expect, it } from 'vitest';
import { requestNumber } from './requests';

describe('requestNumber', () => {
  it('writes the number staff say aloud', () => {
    expect(requestNumber(12)).toBe('DSR-12');
    expect(requestNumber(32)).toBe('DSR-32');
  });
});
