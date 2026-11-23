// Tests for the click handler of a link that leaves the service panel: a plain click goes through the unsaved-changes gate, any click
// that asks the browser for something else, and a link with no gate, is left to the link.
import { act, renderHook } from '@testing-library/react';
import type { MouseEvent, ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { LeaveGate } from '../components/panel/types';
import { useLeaveClick } from './useLeaveClick';

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/catalog?open=5']}>{children}</MemoryRouter>
);

/** A click as a link receives it; `init` changes what the test needs to. */
function click(
  init: Partial<Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>> = {},
) {
  const preventDefault = vi.fn();
  const event = {
    defaultPrevented: false,
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault,
    ...init,
  } as unknown as MouseEvent<HTMLElement>;
  return { event, preventDefault };
}

function setup(gate: LeaveGate | undefined) {
  return renderHook(() => ({ leave: useLeaveClick(gate), location: useLocation() }), { wrapper });
}

describe('useLeaveClick', () => {
  it('holds a plain click back and hands the move to the gate, which can carry it out', () => {
    const gate = vi.fn<LeaveGate>();
    const { result } = setup(gate);
    const { event, preventDefault } = click();
    act(() => result.current.leave('/orders?tab=all')(event));
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(gate).toHaveBeenCalledTimes(1);
    // Nothing moved yet: the gate has not carried the move out.
    expect(result.current.location.pathname).toBe('/catalog');
    act(() => gate.mock.calls[0][0]());
    expect(result.current.location.pathname).toBe('/orders');
    expect(result.current.location.search).toBe('?tab=all');
  });

  it('leaves a click that asks for a new tab or window to the browser', () => {
    const gate = vi.fn<LeaveGate>();
    const { result } = setup(gate);
    for (const init of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      const { event, preventDefault } = click(init);
      result.current.leave('/orders')(event);
      expect(preventDefault).not.toHaveBeenCalled();
    }
    expect(gate).not.toHaveBeenCalled();
  });

  it('leaves the link alone when there is no gate', () => {
    const { result } = setup(undefined);
    const { event, preventDefault } = click();
    result.current.leave('/orders')(event);
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
