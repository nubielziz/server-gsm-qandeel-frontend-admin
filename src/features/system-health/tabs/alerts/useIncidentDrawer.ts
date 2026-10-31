// How the incident drawer (`?incident=<id>`) uses the browser history: opening adds an entry, and closing goes Back to the
// list when this tab added that entry. Ports no demo page.
import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

// Written on the history entry that opening adds. It says that the entry before it is the list the drawer opened over.
const OPENED_FROM_LIST = { incidentDrawer: 'from-list' };

function openedFromList(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Record<string, unknown>).incidentDrawer === OPENED_FROM_LIST.incidentDrawer
  );
}

export interface IncidentDrawerControls {
  openIncident: (id: number) => void;
  closeIncident: () => void;
}

/**
 * Opening adds a history entry, so Back closes the drawer. Closing then goes Back too, so the drawer leaves no entry that
 * Back would step through with nothing changing on screen. A drawer that was not opened here (a link from another page, a
 * typed address) has no list entry before it, so closing replaces the entry and drops `?incident=` instead.
 */
export function useIncidentDrawer(): IncidentDrawerControls {
  const [, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const openIncident = useCallback(
    (id: number) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          updated.set('incident', String(id));
          return updated;
        },
        { state: OPENED_FROM_LIST },
      ),
    [setParams],
  );

  const closeIncident = useCallback(() => {
    if (openedFromList(state)) {
      void navigate(-1);
      return;
    }
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        updated.delete('incident');
        return updated;
      },
      { replace: true },
    );
  }, [navigate, setParams, state]);

  return { openIncident, closeIncident };
}
