// Tests for the import dialog's counts and words.
import { describe, expect, it } from 'vitest';
import type { ImportPreview, ImportPreviewItem } from '../types';
import {
  countItems,
  hiddenRowsText,
  IMPORT_BADGE,
  importableIds,
  mergePreviews,
  mergeResults,
  previewSummary,
  runWords,
  stoppedText,
} from './importPlan';

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

describe('a long list sent 500 at a time', () => {
  it('puts the previews of the batches together in order, and adds the results of the imports up', () => {
    const answers: ImportPreview[] = [
      { items: [item(1, 'new'), item(2, 'new')] },
      { items: [item(3, 'matching')] },
    ];
    expect(mergePreviews(answers).map((one) => one.supplierServiceId)).toEqual([1, 2, 3]);
    expect(mergePreviews([])).toEqual([]);
    expect(
      mergeResults([
        { created: 500, updated: 0, unchanged: 0 },
        { created: 400, updated: 90, unchanged: 10 },
      ]),
    ).toEqual({ created: 900, updated: 90, unchanged: 10 });
    expect(mergeResults([])).toEqual({ created: 0, updated: 0, unchanged: 0 });
  });

  it('counts the whole list in the summary, with a thousands separator', () => {
    expect(previewSummary({ new: 1_104, matching: 2, changed: 0 })).toBe('1,104 new, 2 already match');
  });

  it('says how many rows the table leaves out', () => {
    expect(hiddenRowsText(200, 1_104)).toBe('and 904 more');
    expect(hiddenRowsText(200, 201)).toBe('and 1 more');
    expect(hiddenRowsText(200, 200)).toBe('');
    expect(hiddenRowsText(200, 3)).toBe('');
  });

  it('words the primary button: progress while a long list goes, Continue after a failure, its own words otherwise', () => {
    expect(runWords('Preview', 'Preview (1,132)', null)).toBe('Preview (1,132)');
    expect(runWords('Preview', 'Preview (1,132)', { upTo: 500, handled: 0, total: 1_132 })).toBe(
      'Previewing 500 of 1,132…',
    );
    expect(runWords('Import', 'Import 1,132 services', { upTo: 1_000, handled: 500, total: 1_132 })).toBe(
      'Importing 1,000 of 1,132…',
    );
    // One batch only: the button keeps its words and shows its spinner.
    expect(runWords('Preview', 'Preview (3)', { upTo: 3, handled: 0, total: 3 })).toBe('Preview (3)');
    expect(runWords('Import', 'Import 1,132 services', { upTo: null, handled: 500, total: 1_132 })).toBe(
      'Continue importing (632 left)',
    );
    expect(runWords('Preview', 'Preview (1,132)', { upTo: null, handled: 500, total: 1_132 })).toBe(
      'Continue previewing (632 left)',
    );
    // The first batch failed, or all went through: nothing to continue.
    expect(runWords('Import', 'Import 1,132 services', { upTo: null, handled: 0, total: 1_132 })).toBe(
      'Import 1,132 services',
    );
    expect(runWords('Import', 'Import 3 services', { upTo: null, handled: 3, total: 3 })).toBe(
      'Import 3 services',
    );
  });

  it('says how far a call got before it stopped, then the server’s words', () => {
    expect(stoppedText('imported', { handled: 500, total: 1_132 }, 'The supplier is down.')).toBe(
      '500 of 1,132 services were imported before it stopped. The supplier is down.',
    );
    expect(stoppedText('previewed', { handled: 1_000, total: 1_132 }, 'Sync first.')).toBe(
      '1,000 of 1,132 services were previewed before it stopped. Sync first.',
    );
    expect(stoppedText('imported', { handled: 0, total: 1_132 }, 'The supplier is down.')).toBe(
      'The supplier is down.',
    );
  });
});
