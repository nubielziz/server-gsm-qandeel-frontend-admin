// Whether the Add services flow is open, kept in the address (`?add=new`, `?add=<supplier id>&from=groups`). The header opens it, the
// host on the page shows it and clears it. Changes replace the history entry, like every other state of the table's address.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { clearAddAddress, parseAddAddress, writeAddAddress, type AddAddress } from '../lib/addAddress';

/**
 * `add` is what the address names (null while the flow is closed). `open` opens the flow with no supplier chosen, or with the
 * one given; `close` removes both keys and keeps the rest of the address (filters, sort, the open service).
 */
export function useAddServicesAddress() {
  const [params, setParams] = useSearchParams();
  const add = useMemo(() => parseAddAddress(params), [params]);
  const open = useCallback(
    (link: AddAddress = { add: 'new' }) =>
      setParams((prev) => writeAddAddress(prev, link), { replace: true }),
    [setParams],
  );
  const close = useCallback(() => setParams((prev) => clearAddAddress(prev), { replace: true }), [setParams]);
  return { add, open, close };
}
