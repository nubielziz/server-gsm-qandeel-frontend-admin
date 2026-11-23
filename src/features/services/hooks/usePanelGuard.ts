// The unsaved-changes guard of the service panel: which sections hold edits, and the question asked before the row changes or the
// panel closes. A section reports its state through `markDirty`; the table's row buttons, the panel's close and every link that leaves
// the page ask through `request*`. While a section is dirty the browser also warns before the tab is closed or reloaded.
import { useCallback, useEffect, useState } from 'react';
import type { Id } from '@/lib/api';
import type { PanelSectionId } from '../components/panel/types';
import type { PanelAddress } from './usePanelAddress';

/** What the staff member asked for while a section had unsaved changes, and has not yet been allowed to do. */
export type PanelMove =
  | { kind: 'close' }
  | { kind: 'open'; id: Id; section?: PanelSectionId }
  /** A move that leaves the panel for good (another view, another page); `go` carries it out. */
  | { kind: 'leave'; go: () => void };

type DirtyMarks = { serviceId: Id | null; sections: readonly PanelSectionId[] };

const NONE: readonly PanelSectionId[] = [];

/**
 * Keeps the set of dirty sections of the open service and holds back a move that would throw their edits away. `dirty` lists the
 * sections that report unsaved changes; `move` is the held-back move (show the question while it is set), `confirm` carries it out and
 * `cancel` drops it. `requestLeave(go)` is for any move that is none of the two above and takes the panel away with it. The marks belong to one service: when another service, or none, is open they start empty, and a late report
 * from a panel that has gone is ignored. Moving to another section of the same service never asks.
 */
export function usePanelGuard({
  open,
  openService,
  close,
}: Pick<PanelAddress, 'open' | 'openService' | 'close'>) {
  const [marks, setMarks] = useState<DirtyMarks>({ serviceId: open, sections: NONE });
  const [move, setMove] = useState<PanelMove | null>(null);

  // Another service (or none) is open: forget the old marks and any question about them. Done while rendering, the React way to
  // reset state when a value changes.
  if (marks.serviceId !== open) {
    setMarks({ serviceId: open, sections: NONE });
    setMove(null);
  }
  const dirty = marks.serviceId === open ? marks.sections : NONE;

  const markDirty = useCallback((serviceId: Id, section: PanelSectionId, isDirty: boolean) => {
    setMarks((prev) => {
      if (prev.serviceId !== serviceId || prev.sections.includes(section) === isDirty) return prev;
      return {
        serviceId,
        sections: isDirty ? [...prev.sections, section] : prev.sections.filter((id) => id !== section),
      };
    });
  }, []);

  const requestOpen = useCallback(
    (id: Id, section?: PanelSectionId) => {
      if (dirty.length > 0 && id !== open) setMove({ kind: 'open', id, section });
      else openService(id, section);
    },
    [dirty.length, open, openService],
  );

  const requestClose = useCallback(() => {
    if (dirty.length > 0) setMove({ kind: 'close' });
    else close();
  }, [dirty.length, close]);

  const requestLeave = useCallback(
    (go: () => void) => {
      if (dirty.length > 0) setMove({ kind: 'leave', go });
      else go();
    },
    [dirty.length],
  );

  const confirm = useCallback(() => {
    if (move?.kind === 'open') openService(move.id, move.section);
    else if (move?.kind === 'close') close();
    else if (move?.kind === 'leave') move.go();
    setMove(null);
  }, [move, openService, close]);

  const cancel = useCallback(() => setMove(null), []);

  // Closing or reloading the tab loses the typing too: let the browser ask.
  const hasEdits = dirty.length > 0;
  useEffect(() => {
    if (!hasEdits) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only ask when a return value is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasEdits]);

  return { dirty, move, markDirty, requestOpen, requestClose, requestLeave, confirm, cancel };
}

/** What `usePanelGuard` returns, for the panel and the page that mount it. */
export type PanelGuard = ReturnType<typeof usePanelGuard>;
