// Tells the host of a panel section whether the section holds unsaved changes, so the panel can ask before it closes or changes service.
import { useEffect, useRef } from 'react';

/**
 * Calls `onDirtyChange` whenever `dirty` changes, and once with `false` when the section goes away (a save that moved the panel to
 * another row, or a closed panel, must not leave the host believing there is something to lose). The callback may change on every
 * render without calling again.
 */
export function useDirtyReport(dirty: boolean, onDirtyChange: (dirty: boolean) => void): void {
  const latest = useRef(onDirtyChange);
  useEffect(() => {
    latest.current = onDirtyChange;
  });
  useEffect(() => {
    latest.current(dirty);
  }, [dirty]);
  useEffect(() => {
    const report = latest;
    return () => report.current(false);
  }, []);
}
