// Tests for usePageClamp: a page past the end of a shrunken list goes back to the last page, only once the count is real.
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePageClamp, type PageClampArgs } from './usePageClamp';

function clamp(args: Omit<PageClampArgs, 'setPage' | 'pageSize'>) {
  const setPage = vi.fn();
  renderHook(() => usePageClamp({ pageSize: 25, setPage, ...args }));
  return setPage;
}

describe('usePageClamp', () => {
  it('goes to the last page that has rows', () => {
    expect(clamp({ page: 9, total: 48, settled: true })).toHaveBeenCalledWith(2);
  });

  it('goes to page 1 when the list is empty', () => {
    expect(clamp({ page: 3, total: 0, settled: true })).toHaveBeenCalledWith(1);
  });

  it('leaves a page that still has rows alone', () => {
    expect(clamp({ page: 2, total: 26, settled: true })).not.toHaveBeenCalled();
  });

  it('waits while the count is unknown or belongs to the previous question', () => {
    expect(clamp({ page: 9, total: undefined, settled: true })).not.toHaveBeenCalled();
    expect(clamp({ page: 9, total: 10, settled: false })).not.toHaveBeenCalled();
  });
});
