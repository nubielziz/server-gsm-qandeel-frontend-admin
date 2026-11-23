// A small hook for the shop forms: tells the panel whether the form holds unsaved changes.
import { useEffect, useRef } from 'react';

/**
 * Calls `onDirtyChange` when `dirty` changes, and with false when the form goes away, so a panel never keeps asking about a form
 * that is no longer there. The latest `onDirtyChange` is used; a new function each render does not call it again.
 */
export function useReportDirty(dirty: boolean, onDirtyChange: (dirty: boolean) => void): void {
  const report = useRef(onDirtyChange);
  useEffect(() => {
    report.current = onDirtyChange;
  });
  useEffect(() => {
    report.current(dirty);
  }, [dirty]);
  useEffect(() => {
    const last = report;
    return () => last.current(false);
  }, []);
}
