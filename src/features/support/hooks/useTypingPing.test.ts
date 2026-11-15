// Tests for the "I am typing" signal: at most one every 3 seconds, only when the draft changed and is not empty, never for the draft that was there when the composer
// opened, a disabled box or a change of tab alone, and a failed signal is forgotten without a word.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TYPING_SEND_MS } from '../lib/liveTiming';
import type { TypingMode } from '../types';
import { useTypingPing } from './useTypingPing';

const { sendTicketTyping } = vi.hoisted(() => ({ sendTicketTyping: vi.fn() }));
vi.mock('../api', () => ({ sendTicketTyping }));

beforeEach(() => {
  vi.useFakeTimers();
  sendTicketTyping.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

type Props = { ticketId: number; mode: TypingMode; draft: string; enabled: boolean };
const start = (change: Partial<Props> = {}) =>
  renderHook((props: Props) => useTypingPing(props), {
    initialProps: { ticketId: 7, mode: 'reply', draft: '', enabled: true, ...change } as Props,
  });

describe('useTypingPing', () => {
  it('sends at once for the first change and then at most once every 3 seconds', () => {
    const view = start();
    view.rerender({ ticketId: 7, mode: 'reply', draft: 'H', enabled: true });
    expect(sendTicketTyping).toHaveBeenCalledTimes(1);
    expect(sendTicketTyping).toHaveBeenLastCalledWith(7, 'reply');
    for (const [index, draft] of ['He', 'Hel', 'Hell', 'Hello'].entries()) {
      act(() => void vi.advanceTimersByTime(500 * (index + 1)));
      view.rerender({ ticketId: 7, mode: 'reply', draft, enabled: true });
    }
    // The third change lands exactly 3 seconds after the first and sends; the fourth comes 2 seconds after that and does not.
    expect(sendTicketTyping.mock.calls.length).toBe(2);
  });

  it('sends nothing for 2.999 seconds and sends again at 3', () => {
    const view = start();
    view.rerender({ ticketId: 7, mode: 'reply', draft: 'a', enabled: true });
    act(() => void vi.advanceTimersByTime(TYPING_SEND_MS - 1));
    view.rerender({ ticketId: 7, mode: 'reply', draft: 'ab', enabled: true });
    expect(sendTicketTyping).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(1));
    view.rerender({ ticketId: 7, mode: 'reply', draft: 'abc', enabled: true });
    expect(sendTicketTyping).toHaveBeenCalledTimes(2);
  });

  it('sends nothing for the draft that was there at the start, an empty or blank draft, or a disabled box', () => {
    const view = start({ draft: 'Half a sentence' });
    expect(sendTicketTyping).not.toHaveBeenCalled();
    view.rerender({ ticketId: 7, mode: 'reply', draft: '', enabled: true });
    view.rerender({ ticketId: 7, mode: 'reply', draft: '   ', enabled: true });
    expect(sendTicketTyping).not.toHaveBeenCalled();
    view.rerender({ ticketId: 7, mode: 'reply', draft: 'x', enabled: false });
    expect(sendTicketTyping).not.toHaveBeenCalled();
  });

  it('does not count a switch between reply and note as typing, and says which one it is when it does send', () => {
    const view = start({ draft: 'abc' });
    view.rerender({ ticketId: 7, mode: 'note', draft: 'abc', enabled: true });
    expect(sendTicketTyping).not.toHaveBeenCalled();
    view.rerender({ ticketId: 7, mode: 'note', draft: 'abcd', enabled: true });
    expect(sendTicketTyping).toHaveBeenLastCalledWith(7, 'note');
  });

  it('ignores a failed signal', async () => {
    sendTicketTyping.mockRejectedValue(new Error('429'));
    const view = start();
    view.rerender({ ticketId: 7, mode: 'reply', draft: 'a', enabled: true });
    await act(async () => {
      await Promise.resolve();
    });
    expect(sendTicketTyping).toHaveBeenCalledTimes(1);
  });
});
