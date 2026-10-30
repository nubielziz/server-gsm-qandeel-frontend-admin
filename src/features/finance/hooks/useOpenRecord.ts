// Which record's drawer or dialog is open, kept in the address as `?journal=25`, `?payment=1048` or `?invoice=7`, so a
// link (the audit log, the palette, a ledger entry) opens it. Opening adds a history entry, so Back closes it.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { parseOpenId, withParams } from '../lib/url';

/** `id` is the open record or null. `open` and `close` keep every other parameter (tab, filters, page) as it is. */
export function useOpenRecord(key: 'journal' | 'payment' | 'invoice') {
  const [params, setParams] = useSearchParams();
  const id = parseOpenId(params, key);
  const open = useCallback(
    (recordId: number) => setParams((prev) => withParams(prev, { [key]: recordId })),
    [key, setParams],
  );
  const close = useCallback(
    () => setParams((prev) => withParams(prev, { [key]: undefined }), { replace: true }),
    [key, setParams],
  );
  return { id, open, close };
}
