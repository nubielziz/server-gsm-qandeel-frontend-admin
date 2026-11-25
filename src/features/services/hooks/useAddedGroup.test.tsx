// Tests for useAddedGroup: it waits for the list, opens the page of the group the address names (replacing the address through `land`), marks the
// group for a moment and lets go of it, and only drops the key for a group the list does not hold.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceCategory } from '../types';
import { ADDED_MARK_MS, useAddedGroup } from './useAddedGroup';

const groups: ServiceCategory[] = Array.from({ length: 120 }, (_, at) => ({
  id: at + 1,
  name: `Group ${at + 1}`,
  type: 'server',
  allowedGroupIds: [],
  sort: at,
  isActive: true,
}));

const address = (patch: Partial<Parameters<typeof useAddedGroup>[0]> = {}) => ({
  added: 101 as number | null,
  page: 1,
  size: 50,
  q: '',
  land: vi.fn(),
  ...patch,
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAddedGroup', () => {
  it('does nothing while the list is not settled', () => {
    const where = address();
    const { result } = renderHook(() => useAddedGroup(where, groups, false));
    expect(where.land).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('does nothing when the address names no group', () => {
    const where = address({ added: null });
    const { result } = renderHook(() => useAddedGroup(where, groups, true));
    expect(where.land).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('opens the page of the group, marks it, and lets go of the mark after a while', () => {
    const where = address();
    const { result } = renderHook(() => useAddedGroup(where, groups, true));
    expect(where.land).toHaveBeenCalledWith({ page: 3, q: '' });
    expect(result.current).toEqual({ id: 101, name: 'Group 101' });
    act(() => void vi.advanceTimersByTime(ADDED_MARK_MS - 1));
    expect(result.current).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBeNull();
  });

  it('clears a search that would hide the group', () => {
    const where = address({ q: 'zzz' });
    renderHook(() => useAddedGroup(where, groups, true));
    expect(where.land).toHaveBeenCalledWith({ page: 3, q: '' });
  });

  it('keeps a search that shows the group', () => {
    const where = address({ q: 'group 1', size: 10 });
    renderHook(() => useAddedGroup(where, groups, true));
    // "group 1" matches 1, 10-19, 100-120 (32 groups); Group 101 is the 13th of them.
    expect(where.land).toHaveBeenCalledWith({ page: 2, q: 'group 1' });
  });

  it('only drops the key, on the page it was on, for a group the list does not hold', () => {
    const where = address({ added: 999, page: 2, q: 'group' });
    const { result } = renderHook(() => useAddedGroup(where, groups, true));
    expect(where.land).toHaveBeenCalledWith({ page: 2, q: 'group' });
    expect(result.current).toBeNull();
  });
});
