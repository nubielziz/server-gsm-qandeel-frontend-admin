// Tests for usePartStart: a part that fills a form from the account (Profile) is not drawn while the record is being read again, starts again
// when the record changes while it holds nothing unsaved, keeps its edits (and the copy it started from) while it holds some, and adopts the
// record that follows its own save without starting again (ported from the Product / Services editor's rule).
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nextPartStart, startOf, usePartStart, type PartStartInput } from './usePartStart';

const SCOPE = '7:profile';
const input = (over: Partial<PartStartInput> = {}): PartStartInput => ({
  scope: SCOPE,
  signature: 'A',
  fromRecord: true,
  dirty: false,
  refreshing: false,
  ...over,
});
/** The part drawn on the record "A". */
const drawn = () => nextPartStart(startOf(SCOPE), input());

describe('nextPartStart: the first draw', () => {
  it('waits while the record is being read again, then starts from the record that was read', () => {
    const waiting = nextPartStart(startOf(SCOPE), input({ signature: 'old', refreshing: true }));
    expect(waiting.from).toBeNull();
    const started = nextPartStart(waiting, input({ signature: 'new', refreshing: false }));
    expect(started).toMatchObject({ from: 'new', version: 0 });
  });

  it('starts at once from a record that is not being read again', () => {
    expect(drawn()).toMatchObject({ from: 'A', version: 0 });
  });

  it('never holds back or restarts a part that follows its props', () => {
    const follower = (over: Partial<PartStartInput>) =>
      nextPartStart(startOf(SCOPE), input({ fromRecord: false, ...over }));
    expect(follower({ refreshing: true }).from).toBeNull();
    const moved = nextPartStart(follower({}), input({ fromRecord: false, signature: 'B' }));
    expect(moved.version).toBe(0);
  });

  it('starts another part from nothing', () => {
    const other = nextPartStart(drawn(), input({ scope: '7:overview', refreshing: true }));
    expect(other).toMatchObject({ scope: '7:overview', from: null, version: 0 });
  });
});

describe('nextPartStart: a record that changes', () => {
  it('starts a clean part again from the new record, once', () => {
    const again = nextPartStart(drawn(), input({ signature: 'B' }));
    expect(again).toMatchObject({ from: 'B', version: 1 });
    expect(nextPartStart(again, input({ signature: 'B' }))).toBe(again);
  });

  it('waits for the read to end before it starts again', () => {
    const reading = nextPartStart(drawn(), input({ signature: 'B', refreshing: true }));
    expect(reading).toMatchObject({ from: 'A', version: 0 });
    expect(nextPartStart(reading, input({ signature: 'B' }))).toMatchObject({ from: 'B', version: 1 });
  });

  it('keeps a part with unsaved changes and the copy it started from, whatever the record does', () => {
    const typing = nextPartStart(drawn(), input({ dirty: true }));
    const moved = nextPartStart(typing, input({ dirty: true, signature: 'B' }));
    expect(moved).toMatchObject({ from: 'A', version: 0 });
    const later = nextPartStart(moved, input({ dirty: true, signature: 'C' }));
    expect(later).toMatchObject({ from: 'A', version: 0 });
  });

  it('adopts the record that came while the part was unsaved when the part is saved, without starting it again', () => {
    const typing = nextPartStart(drawn(), input({ dirty: true }));
    const savedAt = nextPartStart(typing, input({ dirty: true, signature: 'B' }));
    const done = nextPartStart(savedAt, input({ dirty: false, signature: 'B' }));
    expect(done).toMatchObject({ from: 'B', version: 0, saved: false });
  });

  it('adopts the record read after the save when that read is still running', () => {
    const typing = nextPartStart(drawn(), input({ dirty: true }));
    const saved = nextPartStart(typing, input({ dirty: false, refreshing: true }));
    expect(saved).toMatchObject({ from: 'A', version: 0, saved: true });
    const read = nextPartStart(saved, input({ signature: 'B' }));
    expect(read).toMatchObject({ from: 'B', version: 0, saved: false });
  });

  it('starts nothing when the typing was undone and the record did not change', () => {
    const typing = nextPartStart(drawn(), input({ dirty: true }));
    const undone = nextPartStart(typing, input({ dirty: false }));
    expect(undone).toMatchObject({ from: 'A', version: 0, saved: false });
  });

  it('starts the part again for a change that comes after its save was settled', () => {
    const typing = nextPartStart(drawn(), input({ dirty: true }));
    const settled = nextPartStart(typing, input({ dirty: false, signature: 'B' }));
    expect(nextPartStart(settled, input({ signature: 'C' }))).toMatchObject({ from: 'C', version: 1 });
  });

  it('returns the state itself when nothing changes, so it can be applied to its own answer', () => {
    const state = drawn();
    expect(nextPartStart(state, input())).toBe(state);
  });
});

describe('usePartStart', () => {
  type Props = { record: unknown; dirty?: boolean; refreshing?: boolean };
  const open = (initial: Props) =>
    renderHook(
      (props: Props) =>
        usePartStart(SCOPE, props.record, {
          fromRecord: true,
          dirty: props.dirty ?? false,
          refreshing: props.refreshing ?? false,
        }),
      { initialProps: initial },
    );

  it('says to wait while the record is being read again, and lets the part be drawn once it is here', () => {
    const { result, rerender } = open({ record: { price: '1' }, refreshing: true });
    expect(result.current).toEqual({ waiting: true, version: 0 });
    rerender({ record: { price: '2' }, refreshing: false });
    expect(result.current).toEqual({ waiting: false, version: 0 });
  });

  it('raises the version when a clean part gets a record with other content, and not for a copy of the same one', () => {
    const { result, rerender } = open({ record: { price: '1' } });
    expect(result.current).toEqual({ waiting: false, version: 0 });
    rerender({ record: { price: '1' } });
    expect(result.current.version).toBe(0);
    rerender({ record: { price: '2' } });
    expect(result.current.version).toBe(1);
  });

  it('keeps the version while the part holds unsaved changes', () => {
    const { result, rerender } = open({ record: { price: '1' } });
    rerender({ record: { price: '1' }, dirty: true });
    rerender({ record: { price: '2' }, dirty: true });
    expect(result.current.version).toBe(0);
    rerender({ record: { price: '2' }, dirty: false });
    expect(result.current.version).toBe(0);
  });

  it('is never waiting for a part that follows its props', () => {
    const { result } = renderHook(() =>
      usePartStart(SCOPE, { price: '1' }, { fromRecord: false, dirty: false, refreshing: true }),
    );
    expect(result.current).toEqual({ waiting: false, version: 0 });
  });
});
