// useDialog: keeps a native <dialog> in sync with an `open` prop. Shared by Modal, Drawer and CommandPalette.
import { useEffect, useRef, type MouseEvent, type PointerEvent, type SyntheticEvent } from 'react';
import { closeModal, focusFirstField, openModal } from './dialog';

export interface UseDialogOptions {
  open: boolean;
  onClose: () => void;
  /** When false, Escape and a click on the backdrop do nothing (a request is running). Default true. */
  dismissible?: boolean;
  /** Move focus to the first form control after opening, like the demo. Default true. */
  focusField?: boolean;
}

/**
 * The dialog is controlled: it only closes when `open` goes false. Escape and a click on the backdrop ask the
 * parent through `onClose` instead of closing it, so the parent stays the single source of truth.
 * Closing through close() (not by removing the element) is what returns focus to the trigger.
 */
export function useDialog({ open, onClose, dismissible = true, focusField = true }: UseDialogOptions) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef<boolean | null>(null);
  const unmounting = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      openModal(dialog);
      if (focusField) focusFirstField(dialog);
    } else closeModal(dialog);
  }, [open, focusField]);

  // Unmount (and React Strict Mode's simulated unmount): close through close() so focus returns to the trigger.
  useEffect(() => {
    const dialog = ref.current;
    unmounting.current = false;
    return () => {
      if (!dialog?.open) return;
      unmounting.current = true;
      closeModal(dialog);
    };
  }, []);

  const dialogProps = {
    onCancel(e: SyntheticEvent<HTMLDialogElement>) {
      e.preventDefault();
      if (dismissible) onClose();
    },
    // Safety net for a native close the parent did not ask for.
    onClose() {
      if (open && !unmounting.current) onClose();
    },
    onPointerDown(e: PointerEvent<HTMLDialogElement>) {
      pressStartedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick(e: MouseEvent<HTMLDialogElement>) {
      // A text selection that starts inside and ends on the backdrop also produces a click on the dialog.
      const startedOnBackdrop = pressStartedOnBackdrop.current ?? true;
      pressStartedOnBackdrop.current = null;
      if (dismissible && startedOnBackdrop && e.target === e.currentTarget) onClose();
    },
  };

  return { ref, dialogProps };
}
