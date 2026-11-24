// Tests for the key a dialog makes when it opens: it lives as long as that opening, whatever re-renders, and the next opening has its own.
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDialogKey } from './useDialogKey';

describe('useDialogKey', () => {
  it('keeps one key for the whole opening, through re-renders', () => {
    const { result, rerender } = renderHook(() => useDialogKey());
    const first = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(first);
    expect(first).toMatch(/^[\x21-\x7e]{1,100}$/);
  });

  it('makes a new key for the next opening', () => {
    const first = renderHook(() => useDialogKey());
    const second = renderHook(() => useDialogKey());
    expect(second.result.current).not.toBe(first.result.current);
  });
});
