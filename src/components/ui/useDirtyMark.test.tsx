// Tests for the mark of unsaved changes in a record's view: it follows the part's reports, starts clean for every part, and ignores a report
// from a part that is no longer the open one.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDirtyMark } from './useDirtyMark';

describe('useDirtyMark', () => {
  it('starts clean and follows the reports of the open part', () => {
    const { result } = renderHook(() => useDirtyMark('7:overview'));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.report(true));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.report(false));
    expect(result.current.dirty).toBe(false);
  });

  it('keeps the identity of the report for one part, so a part can depend on it in an effect', () => {
    const { result, rerender } = renderHook(() => useDirtyMark('7:overview'));
    const first = result.current.report;
    act(() => result.current.report(true));
    rerender();
    expect(result.current.report).toBe(first);
  });

  it('starts the next part clean, whatever the one before it held', () => {
    const { result, rerender } = renderHook(({ scope }) => useDirtyMark(scope), {
      initialProps: { scope: '7:overview' },
    });
    act(() => result.current.report(true));
    expect(result.current.dirty).toBe(true);
    rerender({ scope: '7:activity' });
    expect(result.current.dirty).toBe(false);
  });

  it('starts another record clean too, and does not bring the old mark back when the first part is open again', () => {
    const { result, rerender } = renderHook(({ scope }) => useDirtyMark(scope), {
      initialProps: { scope: '7:overview' },
    });
    act(() => result.current.report(true));
    rerender({ scope: '8:overview' });
    expect(result.current.dirty).toBe(false);
    rerender({ scope: '7:overview' });
    expect(result.current.dirty).toBe(false);
  });

  it('ignores a late report from the part that was open before', () => {
    const { result, rerender } = renderHook(({ scope }) => useDirtyMark(scope), {
      initialProps: { scope: '7:overview' },
    });
    const lateReport = result.current.report;
    rerender({ scope: '7:activity' });
    act(() => lateReport(true));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.report(true));
    expect(result.current.dirty).toBe(true);
  });
});
