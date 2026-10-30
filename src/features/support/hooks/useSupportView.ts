// The support page's filters, open thread, page and view, kept in the address (`?filter=late&ticket=4202`), so a link or a
// reload shows the same screen. Filter changes replace the history entry (Back should leave the page, not walk through every
// keystroke); opening a thread adds one, so Back on a phone returns from the thread to the list.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  parsePage,
  parseSupportFilters,
  parseTicketId,
  parseView,
  writePage,
  writeSupportFilters,
  writeTicket,
  writeView,
  type SupportFilters,
  type SupportView,
} from '../lib/filters';

export function useSupportView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseSupportFilters(params), [params]);
  const ticketId = parseTicketId(params);
  const page = parsePage(params);
  const view = parseView(params);

  /** Changes some filters; the list starts again at page 1 and shows its first ticket. */
  const setFilters = useCallback(
    (patch: Partial<SupportFilters>) =>
      setParams((prev) => writeSupportFilters(prev, patch), { replace: true }),
    [setParams],
  );
  /** The demo's "Show open tickets": the default filter, everyone and no search (a chosen customer stays). */
  const resetFilters = useCallback(
    () =>
      setParams(
        (prev) => {
          const { customerId } = parseSupportFilters(prev);
          return writeSupportFilters(prev, {
            filter: customerId === null ? 'open' : 'all',
            who: 'all',
            q: '',
          });
        },
        { replace: true },
      ),
    [setParams],
  );
  const select = useCallback((id: number) => setParams((prev) => writeTicket(prev, id)), [setParams]);
  /** The demo's "Back to the list" (phones only). */
  const closeThread = useCallback(
    () => setParams((prev) => writeTicket(prev, null), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setView = useCallback((next: SupportView) => setParams((prev) => writeView(prev, next)), [setParams]);

  return { filters, ticketId, page, view, setFilters, resetFilters, select, closeThread, setPage, setView };
}
