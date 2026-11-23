// How a part of a record's edit view tells its host that it holds unsaved changes (`onDirtyChange`), so the host can ask before another part
// or view is opened. The callback is read through a ref, so a host that passes a new function on every render cannot start a loop, and a
// part that goes away says "clean" last, so a part left on purpose does not keep the host asking.
import { useCallback, useEffect, useRef, useState } from 'react';

/** Reports `dirty` to the host whenever it changes, and `false` when the part (or section) unmounts. */
export function useReportDirty(dirty: boolean, onDirtyChange: (dirty: boolean) => void): void {
  const latest = useRef(onDirtyChange);
  useEffect(() => {
    latest.current = onDirtyChange;
  });
  useEffect(() => {
    latest.current(dirty);
  }, [dirty]);
  useEffect(() => {
    const host = latest;
    return () => host.current(false);
  }, []);
}

/** What a section of a part calls to say whether it holds unsaved changes. */
export type ReportSection = (id: string, dirty: boolean) => void;

/**
 * For a part made of several sections that save on their own: each section reports its own state through the returned `report(id, dirty)`
 * (it keeps its identity), and the host hears one answer, "dirty" while any section is.
 */
export function useDirtySections(onDirtyChange: (dirty: boolean) => void): ReportSection {
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(() => new Set());
  const report = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  useReportDirty(dirtyIds.size > 0, onDirtyChange);
  return report;
}
