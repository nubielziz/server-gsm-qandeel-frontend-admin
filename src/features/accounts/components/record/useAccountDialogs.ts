// useAccountDialogs: the state behind the dialog host. A part or the list calls `open(action, accounts)`; the page draws `AccountDialogs`
// with `request` and `close`. One dialog at a time; each opening is its own (so a dialog mounted for it starts empty).
import { useCallback, useRef, useState } from 'react';
import type { AccountRow } from '../../types';
import type { AccountAction } from '../types';

/** What is open: the action, the accounts it is about, and the number of this opening. */
export type DialogRequest = {
  action: AccountAction;
  accounts: readonly AccountRow[];
  opening: number;
  onClosed?: () => void;
};

/** Options of one opening: what to do once the dialog has closed (the list clears the ticks of a bulk action). */
export type OpenOptions = { onClosed?: () => void };

/** `open` for the parts and the list, and `request` and `close` for the host. Side effects: none beyond its own state. */
export function useAccountDialogs() {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const openings = useRef(0);

  const open = useCallback(
    (action: AccountAction, accounts: readonly AccountRow[], options: OpenOptions = {}) => {
      if (accounts.length === 0) return;
      openings.current += 1;
      setRequest({ action, accounts, opening: openings.current, onClosed: options.onClosed });
    },
    [],
  );

  const close = useCallback(() => {
    request?.onClosed?.();
    setRequest(null);
  }, [request]);

  return { request, open, close };
}
