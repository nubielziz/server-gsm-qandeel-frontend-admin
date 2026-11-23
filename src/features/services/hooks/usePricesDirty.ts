// How the panel's Prices section tells the panel it holds unsaved changes: the two forms each report theirs, the panel hears one.
import { useEffect, useRef, useState } from 'react';

/**
 * Joins the dirty flags of the section's two forms into the one answer the panel asks for. `setMerchant` and `setGroups` are
 * stable, so a form can report from an effect. The panel hears the change once per change, never once per render, and hears
 * "clean" when the section goes away (the panel re-keys a section after a save).
 */
export function usePricesDirty(onDirtyChange: (dirty: boolean) => void) {
  const [merchant, setMerchant] = useState(false);
  const [groups, setGroups] = useState(false);
  const dirty = merchant || groups;

  // The newest callback, without making the effects below depend on it: a parent may pass a new function each render.
  const latest = useRef(onDirtyChange);
  useEffect(() => {
    latest.current = onDirtyChange;
  });
  useEffect(() => {
    latest.current(dirty);
  }, [dirty]);
  useEffect(() => () => latest.current(false), []);

  return { setMerchant, setGroups };
}
