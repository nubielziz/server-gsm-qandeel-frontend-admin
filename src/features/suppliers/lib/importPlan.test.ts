// Tests for the import dialog's counts and words.
import { describe, expect, it } from 'vitest';
import type { ImportPreviewItem } from '../types';
import { countItems, IMPORT_BADGE, importableIds, previewSummary } from './importPlan';

const item = (id: number, state: ImportPreviewItem['state']) =>
  ({ supplierServiceId: id, state }) as ImportPreviewItem;
const items = [item(1, 'new'), item(2, 'changed'), item(3, 'matching'), item(4, 'new')];

describe('the preview', () => {
  it('counts the states and words the line above the table', () => {
    const counts = countItems(items);
    expect(counts).toEqual({ new: 2, matching: 1, changed: 1 });
    expect(previewSummary(counts)).toBe('2 new, 1 with a changed cost, 1 already match');
    expect(previewSummary({ new: 0, matching: 3, changed: 0 })).toBe('3 already match');
    expect(previewSummary({ new: 0, matching: 0, changed: 0 })).toBe('Nothing was picked');
  });

  it('sends the new and the changed ones, not the ones that already match', () => {
    expect(importableIds(items)).toEqual([1, 2, 4]);
    expect(importableIds([item(3, 'matching')])).toEqual([]);
  });

  it('has a badge for every state', () => {
    expect(Object.keys(IMPORT_BADGE).sort()).toEqual(['changed', 'matching', 'new']);
  });
});
