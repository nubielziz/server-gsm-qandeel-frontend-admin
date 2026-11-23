// Tests for the Order form section's lookups: the words for a field's type, the entry count of each option list and the text beside it.
import { describe, expect, it } from 'vitest';
import type { ServiceFieldType, ServiceOption } from '../../../types';
import { fieldTypeLabel, listCountText, optionListCounts } from './orderFormSummary';

const option = (list: ServiceOption['list'], value: string): ServiceOption => ({
  list,
  value,
  label: value,
  supplierValue: '',
});

describe('fieldTypeLabel', () => {
  it('names the four types the way the Fields dialog does', () => {
    expect(fieldTypeLabel('text')).toBe('Text');
    expect(fieldTypeLabel('number')).toBe('Number');
    expect(fieldTypeLabel('select')).toBe('Choice list');
    expect(fieldTypeLabel('textarea')).toBe('Long text');
  });

  it('shows a type it does not know as the server sent it', () => {
    expect(fieldTypeLabel('date' as ServiceFieldType)).toBe('date');
  });
});

describe('optionListCounts', () => {
  it('counts the entries of each list, in the order the Options dialog shows them', () => {
    const counts = optionListCounts([
      option('network', 'n1'),
      option('model', 'm1'),
      option('model', 'm2'),
      option('model', 'm3'),
    ]);
    expect(counts).toEqual([
      { id: 'model', label: 'Models', count: 3 },
      { id: 'network', label: 'Networks', count: 1 },
      { id: 'mep', label: 'MEP', count: 0 },
    ]);
  });

  it('gives every list a count of zero when there are no options', () => {
    expect(optionListCounts([]).map((list) => list.count)).toEqual([0, 0, 0]);
  });
});

describe('listCountText', () => {
  it('says None for an empty list and the number of entries otherwise', () => {
    expect(listCountText(0)).toBe('None');
    expect(listCountText(1)).toBe('1 entry');
    expect(listCountText(12)).toBe('12 entries');
  });
});
