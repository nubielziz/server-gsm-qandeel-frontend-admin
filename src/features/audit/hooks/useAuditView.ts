// The Audit log page's filters, kept in the address. A filter change replaces the history entry (Back should leave the
// page, not walk through every keystroke).
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { clearView, parseView, writeView, type AuditView } from '../lib/view';

/** `view` is what the address says; `setView` changes some filters; `clear` removes them all. */
export function useAuditView() {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseView(params), [params]);
  const setView = useCallback(
    (patch: Partial<AuditView>) => setParams((prev) => writeView(prev, patch), { replace: true }),
    [setParams],
  );
  const clear = useCallback(() => setParams((prev) => clearView(prev), { replace: true }), [setParams]);
  return { view, setView, clear };
}
