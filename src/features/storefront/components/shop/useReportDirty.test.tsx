// Tests for the hook that tells the panel whether a shop form holds unsaved changes.
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useReportDirty } from './useReportDirty';

type Report = (dirty: boolean) => void;

describe('useReportDirty', () => {
  it('reports the state at first and each time it changes, and false when the form goes away', () => {
    const report = vi.fn();
    const { rerender, unmount } = renderHook(({ dirty }) => useReportDirty(dirty, report), {
      initialProps: { dirty: false },
    });
    expect(report).toHaveBeenLastCalledWith(false);
    rerender({ dirty: true });
    expect(report).toHaveBeenLastCalledWith(true);
    expect(report).toHaveBeenCalledTimes(2);
    rerender({ dirty: true });
    expect(report).toHaveBeenCalledTimes(2);
    unmount();
    expect(report).toHaveBeenLastCalledWith(false);
  });

  it('uses the latest callback without calling it again for a new function', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ dirty, report }: { dirty: boolean; report: Report }) => useReportDirty(dirty, report),
      { initialProps: { dirty: true, report: first as Report } },
    );
    expect(first).toHaveBeenCalledTimes(1);
    rerender({ dirty: true, report: second as Report });
    expect(second).not.toHaveBeenCalled();
    unmount();
    expect(second).toHaveBeenCalledWith(false);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
