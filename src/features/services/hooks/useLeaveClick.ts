// useLeaveClick: the click handler of a link that leaves the Catalog's service panel (the header's links, the Activity section's), so the
// unsaved-changes guard is asked before the page moves.
import { useCallback, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import type { LeaveGate } from '../components/panel/types';

/**
 * Returns `leave(to)`, an `onClick` for a link to `to`. With a gate, a plain click is held back and the move goes through it (at once
 * when nothing is unsaved, after the question otherwise); a click that asks the browser for a new tab or window, and a link without a
 * gate, behave as links do. Keep the link's `to` too, so it stays a real link.
 */
export function useLeaveClick(onLeave: LeaveGate | undefined) {
  const navigate = useNavigate();
  return useCallback(
    (to: string) => (event: MouseEvent<HTMLElement>) => {
      if (!onLeave || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onLeave(() => void navigate(to));
    },
    [navigate, onLeave],
  );
}
