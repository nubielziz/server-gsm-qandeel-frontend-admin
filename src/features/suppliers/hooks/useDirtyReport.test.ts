// Tests for the report a panel section makes about unsaved changes: on every change, and "no longer dirty" when it goes away.
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDirtyReport } from './useDirtyReport';

describe('useDirtyReport', () => {
  it('reports the first value, then each change, and says false when the section unmounts', () => {
    const report = vi.fn();
    const { rerender, unmount } = renderHook(({ dirty }) => useDirtyReport(dirty, report), {
      initialProps: { dirty: false },
    });
    expect(report.mock.calls).toEqual([[false]]);
    rerender({ dirty: true });
    rerender({ dirty: true });
    expect(report.mock.calls).toEqual([[false], [true]]);
    unmount();
    expect(report.mock.calls.at(-1)).toEqual([false]);
  });

  it('does not report again because the callback is a new function on every render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ report }) => useDirtyReport(true, report), {
      initialProps: { report: first },
    });
    rerender({ report: second });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
