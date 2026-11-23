// Tests for the import dialog's counts and words.
import { describe, expect, it } from 'vitest';
import type { ImportPreview, ImportPreviewItem } from '../types';
import { BatchStopped } from './batches';
import {
  countItems,
  failureText,
  hiddenRowsText,
  IMPORT_BADGE,
  importableIds,
  importToast,
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

  it('puts the ids of the created services together in the order of the batches, and only when an answer carried them', () => {
    expect(
      mergeResults([
        { created: 2, updated: 1, unchanged: 0, createdServiceIds: [11, 12] },
        { created: 1, updated: 0, unchanged: 4, createdServiceIds: [13] },
        { created: 0, updated: 2, unchanged: 0, createdServiceIds: [] },
      ]),
    ).toEqual({ created: 3, updated: 3, unchanged: 4, createdServiceIds: [11, 12, 13] });
    // An older server sends no ids: the sum has no key, rather than an empty list that would say "none were created".
    expect(mergeResults([{ created: 2, updated: 0, unchanged: 0 }])).not.toHaveProperty('createdServiceIds');
    // One answer without the key among others with it adds nothing to the list.
    expect(
      mergeResults([
        { created: 1, updated: 0, unchanged: 0 },
        { created: 1, updated: 0, unchanged: 0, createdServiceIds: [7] },
      ]).createdServiceIds,
    ).toEqual([7]);
  });

  it('words the toast after an import', () => {
    expect(importToast({ created: 1, updated: 1, unchanged: 0 })).toEqual({
      message: '2 services imported',
      description: '1 new, 1 updated',
    });
    expect(importToast({ created: 1_200, updated: 0, unchanged: 3 })).toEqual({
      message: '1,200 services imported',
      description: '1,200 new, 3 unchanged',
    });
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

  it('words the button of the Add flow with "Add"', () => {
    expect(runWords('Add', 'Start', null)).toBe('Start');
    expect(runWords('Add', 'Start', { upTo: 500, handled: 0, total: 1_132 })).toBe('Adding 500 of 1,132…');
    expect(runWords('Add', 'Start', { upTo: 500, handled: 0, total: 500 })).toBe('Start');
    expect(runWords('Add', 'Start', { upTo: null, handled: 500, total: 1_132 })).toBe(
      'Continue adding (632 left)',
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
    expect(stoppedText('added', { handled: 500, total: 1_132 }, 'The supplier is down.')).toBe(
      '500 of 1,132 services were added before it stopped. The supplier is down.',
    );
  });

  it('tells a failed call: how far a batched one got, or just the server’s words', () => {
    const reason = { detail: 'The supplier is down.' };
    expect(failureText(new BatchStopped(500, 1_132, reason), 'imported')).toBe(
      '500 of 1,132 services were imported before it stopped. The supplier is down.',
    );
    expect(failureText(new BatchStopped(0, 3, reason), 'added')).toBe('The supplier is down.');
    expect(failureText(reason, 'previewed')).toBe('The supplier is down.');
  });
});
