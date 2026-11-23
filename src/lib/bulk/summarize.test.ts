// Tests for naming the refused ids of a sequential run for the summary dialog.
import { describe, expect, it } from 'vitest';
import { summarizeOutcome } from './summarize';

type Row = { id: number; code: string };
const naming = { keyOf: (row: Row) => row.id, labelOf: (row: Row) => row.code };

describe('summarizeOutcome', () => {
  it('names the refused ids like the table does and counts the items', () => {
    const rows: Row[] = [
      { id: 1, code: 'A-1' },
      { id: 2, code: 'A-2' },
      { id: 3, code: 'A-3' },
    ];
    const summary = summarizeOutcome(
      'switched off',
      rows,
      { done: 2, failed: [{ id: 2, reason: 'Not found.' }] },
      naming,
    );
    expect(summary).toEqual({
      verb: 'switched off',
      done: 2,
      total: 3,
      failed: [{ label: 'A-2', reason: 'Not found.' }],
    });
  });

  it('shows #id for an id that is not among the items', () => {
    const summary = summarizeOutcome(
      'moved',
      [{ id: 1, code: 'A-1' }],
      { done: 0, failed: [{ id: 9, reason: 'Gone.' }] },
      naming,
    );
    expect(summary.failed).toEqual([{ label: '#9', reason: 'Gone.' }]);
  });

  it('has no failed lines for a clean run', () => {
    expect(
      summarizeOutcome('moved', [{ id: 1, code: 'A-1' }], { done: 1, failed: [] }, naming).failed,
    ).toEqual([]);
  });
});
