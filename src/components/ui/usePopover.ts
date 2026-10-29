// usePopover: open/close state plus the anchor element for Menu and InfoTip (replaces menuAnchor/menuEl in 20-ui.js).
import { useCallback, useState } from 'react';

/**
 * Wire a trigger to an anchored panel:
 *   const pop = usePopover();
 *   <Button ref={pop.anchorRef} onClick={pop.toggle} aria-expanded={pop.open} />
 *   <Menu {...pop.panelProps} items={items} />
 * The anchor is state (not a ref) so the panel renders as soon as the trigger has mounted.
 */
export function usePopover() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  return { anchorRef: setAnchor, open, toggle, close, panelProps: { anchor, open, onClose: close } };
}
