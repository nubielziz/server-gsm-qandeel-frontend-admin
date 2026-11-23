// Tests for the sentence that tells what the server made of an import.
import { describe, expect, it } from 'vitest';
import { importSummary } from './importSummary';

describe('importSummary', () => {
  it('tells the imported codes, the duplicates, the unreadable lines and the batch', () => {
    expect(importSummary({ imported: 2, duplicates: 2, rejected: 1, batchRef: 'INV-77' })).toBe(
      'Imported 2 codes. 2 duplicates skipped. 1 line could not be read. Batch INV-77.',
    );
  });

  it('says nothing about duplicates or unreadable lines when there are none, and counts one in the singular', () => {
    expect(importSummary({ imported: 1, duplicates: 0, rejected: 0 })).toBe('Imported 1 code.');
    expect(importSummary({ imported: 0, duplicates: 1, rejected: 2, batchRef: '' })).toBe(
      'Imported 0 codes. 1 duplicate skipped. 2 lines could not be read.',
    );
  });
});
