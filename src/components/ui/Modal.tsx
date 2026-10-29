// Modal: dialog frame with title, body, error slot and footer. Ports modal() of 20-ui.js (native <dialog>).
import { useId, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';
import { useDialog } from './useDialog';

export interface ModalProps {
  open: boolean;
  /** Asked for by Escape, a click on the backdrop and the close button. The parent sets `open` to false. */
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  /** `lg` is 760px wide (ledger entries); the default is 520px. */
  size?: 'md' | 'lg';
  /** Content of the footer bar, normally the Cancel and Confirm buttons. Leave out for an info-only dialog. */
  footer?: ReactNode;
  /** Text for the error slot under the body (a live region, announced when it changes). */
  error?: string | null;
  /** False while a request runs: Escape, backdrop and the close button are ignored. */
  dismissible?: boolean;
  /** Submit handler of the form that wraps the dialog (header, body, footer). */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
}

/**
 * Content is mounted only while open, so every opening starts with fresh fields.
 * The dialog is portalled to <body>, which also avoids nesting its <form> inside another form.
 */
export function Modal({
  open,
  onClose,
  title,
  sub,
  size = 'md',
  footer,
  error,
  dismissible = true,
  onSubmit,
  children,
}: ModalProps) {
  const titleId = useId();
  const { ref, dialogProps } = useDialog({ open, onClose, dismissible });

  return createPortal(
    <dialog
      ref={ref}
      className={cx('dlg', size === 'lg' && 'dlg-lg')}
      aria-labelledby={titleId}
      {...dialogProps}
    >
      {open && (
        <form method="dialog" noValidate onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
          <div className="dlg-h">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {sub && <p className="mt-0.5 text-sm text-ink2">{sub}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon
              aria-label="Close"
              disabled={!dismissible}
              onClick={() => onClose()}
            >
              <Icon name="x" />
            </Button>
          </div>
          <div className="dlg-b">
            {children}
            {/* Always in the DOM so screen readers announce the text when it appears. */}
            <p className={error ? 'mt-3 text-sm text-crit-fg' : 'hidden'} role="alert">
              {error}
            </p>
          </div>
          {footer && <div className="dlg-f">{footer}</div>}
        </form>
      )}
    </dialog>,
    document.body,
  );
}
