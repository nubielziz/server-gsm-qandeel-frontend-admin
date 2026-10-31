// The Refresh button's behaviour: read every health card again and report when it is done, so the button can show a busy state.
import { useCallback, useState } from 'react';
import { useRefreshHealth } from '../hooks';

/** `run` ignores a second click while a refresh is still running. `busy` is true until every card has finished. */
export function useRefreshAction(): { busy: boolean; run: () => Promise<void> } {
  const refresh = useRefreshHealth();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);
  return { busy, run };
}
