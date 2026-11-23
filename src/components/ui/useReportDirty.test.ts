// Tests for how a part of an edit view tells its host about unsaved changes: every change of the flag, "clean" when the part goes away, no
// loop when the host passes a new function on each render, and one answer for a part made of several sections.
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDirtySections, useReportDirty } from './useReportDirty';

describe('useReportDirty', () => {
  it('reports the first value, then each change, and says false when the part unmounts', () => {
    const report = vi.fn();
    const { rerender, unmount } = renderHook(({ dirty }) => useReportDirty(dirty, report), {
      initialProps: { dirty: false },
    });
    expect(report.mock.calls).toEqual([[false]]);
    rerender({ dirty: true });
    rerender({ dirty: true });
    expect(report.mock.calls).toEqual([[false], [true]]);
    unmount();
    expect(report.mock.calls.at(-1)).toEqual([false]);
  });

  it('does not report again when only the host function changes, and uses the newest one to say clean', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ onDirtyChange }) => useReportDirty(true, onDirtyChange), {
      initialProps: { onDirtyChange: first },
    });
    expect(first).toHaveBeenCalledTimes(1);
    rerender({ onDirtyChange: second });
    expect(second).not.toHaveBeenCalled();
    unmount();
    expect(second).toHaveBeenLastCalledWith(false);
    expect(first).toHaveBeenCalledTimes(1);
  });
});

describe('useDirtySections', () => {
  it('is dirty while any section is, and clean once none is', () => {
    const onDirtyChange = vi.fn();
    const { result } = renderHook(() => useDirtySections(onDirtyChange));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    act(() => result.current('quantity', true));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    act(() => result.current('fields', true));
    act(() => result.current('quantity', false));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    act(() => result.current('fields', false));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('ignores a section that says the same thing twice', () => {
    const onDirtyChange = vi.fn();
    const { result } = renderHook(() => useDirtySections(onDirtyChange));
    act(() => result.current('options', true));
    const calls = onDirtyChange.mock.calls.length;
    act(() => result.current('options', true));
    expect(onDirtyChange.mock.calls).toHaveLength(calls);
  });

  it('says clean when the part goes away with edits', () => {
    const onDirtyChange = vi.fn();
    const { result, unmount } = renderHook(() => useDirtySections(onDirtyChange));
    act(() => result.current('page', true));
    unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('gives the same function on every render', () => {
    const { result, rerender } = renderHook(() => useDirtySections(vi.fn()));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
