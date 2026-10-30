// Tests for the words and badges, including a value the table does not know.
import { describe, expect, it } from 'vitest';
import { countryName } from './countries';
import { BLOCK_KIND_LABEL, CHECK_KIND_LABEL, labelOf, resultBadge, riskLevel } from './labels';

describe('labels', () => {
  it('names the kinds in the demo’s words and passes an unknown value through', () => {
    expect(labelOf(CHECK_KIND_LABEL, 'sim_lock')).toBe('SIM lock');
    expect(labelOf(BLOCK_KIND_LABEL, 'domain')).toBe('Email domain');
    expect(labelOf(BLOCK_KIND_LABEL, 'hologram')).toBe('hologram');
    // Not an own property of the table, so it must not read from the prototype.
    expect(labelOf(BLOCK_KIND_LABEL, 'toString')).toBe('toString');
  });

  it('gives each result a tone and a word, and a neutral badge to an unknown result', () => {
    expect(resultBadge('blacklisted')).toMatchObject({ tone: 'crit', label: 'Blacklisted' });
    expect(resultBadge('clean')).toMatchObject({ tone: 'good', label: 'Clean' });
    expect(resultBadge('weird')).toMatchObject({ tone: 'neutral', label: 'weird' });
  });

  it('gives a customer level a tone', () => {
    expect(riskLevel('medium')).toEqual({ tone: 'warn', label: 'Medium' });
    expect(riskLevel('???')).toEqual({ tone: 'neutral', label: '???' });
  });
});

describe('countryName', () => {
  it('writes a code as the country’s name and keeps anything else as it is', () => {
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('us')).toBe('United States');
    expect(countryName('Atlantis')).toBe('Atlantis');
  });
});
