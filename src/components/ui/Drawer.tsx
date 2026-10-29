// Drawer: 580px side sheet from the inline-end edge with a sticky footer. Ports openDrawer/closeDrawer of 20-ui.js.
import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';
import { useDialog } from './useDialog';

export interface DrawerProps {
  open: boolean;
  /** Asked for by Escape, a click on the scrim and the close button. The parent sets `open` to false. */
  onClose: () => void;
  title: ReactNode;
  /** Extra classes for the title, for example `mono` for an order ID. */
  titleClassName?: string;
  /** Badges and tags shown right of the title. */
  badges?: ReactNode;
  /** Muted line under the title. */
  sub?: ReactNode;
  /** Sticky action bar at the bottom (`drawer-f`): the page's primary action goes here. */
  footer?: ReactNode;
  closeLabel?: string;
  /** Scrolling body (`drawer-b`). */
  children?: ReactNode;
}

/** Native dialog, so focus is trapped, Escape works and it sits in the top layer above the page. */
export function Drawer({
  open,
  onClose,
  title,
  titleClassName,
  badges,
  sub,
  footer,
  closeLabel = 'Close details',
  children,
}: DrawerProps) {
  const titleId = useId();
  const { ref, dialogProps } = useDialog({ open, onClose, focusField: false });

  return createPortal(
    <dialog ref={ref} className="drawer" aria-labelledby={titleId} {...dialogProps}>
      {open && (
        <div className="flex h-full flex-col">
          <div className="drawer-h">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className={cx('text-lg font-semibold', titleClassName)}>
                  {title}
                </h2>
                {badges}
              </div>
              {sub && <p className="mt-0.5 text-xs text-ink3">{sub}</p>}
            </div>
            <Button variant="ghost" icon aria-label={closeLabel} onClick={() => onClose()}>
              <Icon name="x" />
            </Button>
          </div>
          <div className="drawer-b">{children}</div>
          {footer && <div className="drawer-f">{footer}</div>}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
