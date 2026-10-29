// Tests for the notification provider: Refine's notification types mapped to the toast store.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearToasts, getToasts } from '@/components/ui';
import { notificationProvider, toToastInput } from './notificationProvider';

afterEach(() => {
  clearToasts();
  vi.useRealTimers();
});

describe('toToastInput', () => {
  it('maps success and error to the same toast kind, with the message as title and the description as body', () => {
    expect(toToastInput({ key: 'k1', type: 'success', message: 'Saved', description: 'Order 7' })).toEqual({
      id: 'k1',
      kind: 'success',
      title: 'Saved',
      body: 'Order 7',
    });
    expect(toToastInput({ type: 'error', message: 'Could not save' })).toEqual({
      id: undefined,
      kind: 'error',
      title: 'Could not save',
      body: undefined,
    });
  });

  it('maps the undo countdown ("progress") to an info toast with an Undo button', () => {
    const cancelMutation = vi.fn();
    const input = toToastInput({
      key: 'undo-1',
      type: 'progress',
      message: 'You have 5 seconds to undo',
      cancelMutation,
      undoableTimeout: 5,
    });
    expect(input).toMatchObject({ id: 'undo-1', kind: 'info', title: 'You have 5 seconds to undo' });
    expect(input.action?.label).toBe('Undo');
    input.action?.run();
    expect(cancelMutation).toHaveBeenCalledOnce();
  });

  it('offers no Undo button when there is nothing to cancel', () => {
    expect(toToastInput({ type: 'progress', message: 'Working' }).action).toBeUndefined();
  });
});

describe('notificationProvider', () => {
  it('shows a toast, and a repeated key replaces it instead of stacking', () => {
    notificationProvider.open({ key: 'same', type: 'success', message: 'First' });
    notificationProvider.open({ key: 'same', type: 'error', message: 'Second', description: 'Details' });
    const toasts = getToasts();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ id: 'same', kind: 'error', title: 'Second', body: 'Details' });
  });

  it('closes a toast by its key', () => {
    notificationProvider.open({ key: 'gone', type: 'success', message: 'Soon gone' });
    notificationProvider.close('gone');
    expect(getToasts()).toHaveLength(0);
  });

  it('dismisses a countdown toast on its own once Refine stops refreshing it', () => {
    vi.useFakeTimers();
    notificationProvider.open({ key: 'u', type: 'progress', message: 'Undo?' });
    expect(getToasts()).toHaveLength(1);
    vi.advanceTimersByTime(2100);
    expect(getToasts()).toHaveLength(0);
  });
});
