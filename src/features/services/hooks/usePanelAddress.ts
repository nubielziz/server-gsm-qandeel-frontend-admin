// The service panel's place in the address: `?open=<service id>` names the service and `?section=<id>` the part of the panel to show.
// Changes replace the history entry and closing drops both, so Back leaves the page instead of walking through every row.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { Id } from '@/lib/api';
import { PANEL_SECTION_IDS, type PanelSectionId } from '../components/panel/types';

/** What the address says about the panel: the open service and the section, or nothing. */
export type PanelAddressState = { open: Id | null; section: PanelSectionId | null };

// A service id is a positive whole number; anything else in the address counts as "no service open".
function parseOpen(value: string | null): Id | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * Reads the open service and the section from the address. A section needs an open service, and one that is not a section of
 * the panel is dropped, so an old or mistyped link opens the panel without naming a part of it.
 */
export function readPanelAddress(params: URLSearchParams): PanelAddressState {
  const open = parseOpen(params.get('open'));
  if (open === null) return { open: null, section: null };
  const section = PANEL_SECTION_IDS.find((candidate) => candidate === params.get('section')) ?? null;
  return { open, section };
}

/**
 * The address with the panel set: `open: null` closes it (both parameters go), a service with no section names only the
 * service. Every other parameter (the chip, the filters, the page, the sort) is kept.
 */
export function writePanelAddress(
  base: URLSearchParams,
  panel: { open: Id | null; section?: PanelSectionId | null },
): URLSearchParams {
  const next = new URLSearchParams(base);
  if (panel.open === null) {
    next.delete('open');
    next.delete('section');
    return next;
  }
  next.set('open', String(panel.open));
  if (panel.section) next.set('section', panel.section);
  else next.delete('section');
  return next;
}

/**
 * The open service and section from the address, and the functions that change them. `openService` names a service (and a part
 * of it) and `close` drops both. Asking the staff member about unsaved changes is the job of `usePanelGuard`, which wraps these.
 */
export function usePanelAddress() {
  const [params, setParams] = useSearchParams();
  const { open, section } = useMemo(() => readPanelAddress(params), [params]);
  const openService = useCallback(
    (id: Id, part?: PanelSectionId) =>
      setParams((prev) => writePanelAddress(prev, { open: id, section: part }), { replace: true }),
    [setParams],
  );
  const close = useCallback(
    () => setParams((prev) => writePanelAddress(prev, { open: null }), { replace: true }),
    [setParams],
  );
  return { open, section, openService, close };
}

/** What `usePanelAddress` returns, for the guard and the components that take it as a prop. */
export type PanelAddress = ReturnType<typeof usePanelAddress>;
