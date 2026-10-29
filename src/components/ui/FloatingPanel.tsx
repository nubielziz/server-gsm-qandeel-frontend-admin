// FloatingPanel: shared shell of Menu and InfoTip. Ports the placement and dismissal parts of openMenu() in 20-ui.js.
import { useLayoutEffect, useRef, type HTMLAttributes, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { floatingPosition, type FloatingAlign } from './floating';

export interface FloatingPanelProps extends HTMLAttributes<HTMLDivElement> {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  align?: FloatingAlign;
  /** Lets the caller reach the panel element (a menu moves focus into it once it is placed). */
  panelRef?: RefObject<HTMLDivElement | null>;
}

/**
 * A fixed-position panel anchored under an element. It closes on Escape (focus returns to the anchor) and on a
 * press outside both the panel and the anchor; a press on the anchor is left to the trigger so it can toggle.
 * It renders inside the open modal dialog when the anchor lives in one, because a modal dialog makes
 * everything outside itself inert.
 */
export function FloatingPanel({
  anchor,
  open,
  onClose,
  align = 'end',
  panelRef,
  className,
  children,
  ...rest
}: FloatingPanelProps) {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? ownRef;
  const visible = open && anchor !== null;

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!visible || !panel || !anchor) return;
    const spot = floatingPosition(
      anchor.getBoundingClientRect(),
      { width: panel.offsetWidth, height: panel.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      align,
    );
    panel.style.left = `${spot.left}px`;
    panel.style.top = `${spot.top}px`;
  }, [visible, anchor, align, ref]);

  useLayoutEffect(() => {
    if (!visible || !anchor) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Capture phase: close the popover before an enclosing dialog treats Escape as its own close request.
      e.preventDefault();
      e.stopPropagation();
      if (anchor.isConnected) anchor.focus();
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [visible, anchor, onClose, ref]);

  if (!visible) return null;
  return createPortal(
    // `!h-auto`: inside a drawer, `dialog.drawer > div { height: 100% }` would otherwise stretch the panel to the screen.
    <div ref={ref} className={cx('fixed z-[90] !h-auto', className)} {...rest}>
      {children}
    </div>,
    anchor.closest('dialog[open]') ?? document.body,
  );
}
