// Tests for the words, including a value the table does not know.
import { describe, expect, it } from 'vitest';
import { countryName } from './countries';
import { BLOCK_KIND_LABEL, BLOCK_SOURCE_LABEL, labelOf } from './labels';

describe('labels', () => {
  it('names the kinds in the demo’s words and passes an unknown value through', () => {
    expect(labelOf(BLOCK_SOURCE_LABEL, 'chargeback')).toBe('After a chargeback');
    expect(labelOf(BLOCK_KIND_LABEL, 'domain')).toBe('Email domain');
    expect(labelOf(BLOCK_KIND_LABEL, 'hologram')).toBe('hologram');
    // Not an own property of the table, so it must not read from the prototype.
    expect(labelOf(BLOCK_KIND_LABEL, 'toString')).toBe('toString');
  });
});

describe('countryName', () => {
  it('writes a code as the country’s name and keeps anything else as it is', () => {
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('us')).toBe('United States');
    expect(countryName('Atlantis')).toBe('Atlantis');
  });
});
