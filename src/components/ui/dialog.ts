// Helpers around the native <dialog>: open as modal, close, and focus the first field like the demo's modal().

/**
 * showModal() with a fallback: jsdom has no showModal, so there the `open` attribute is set instead.
 * Native dialogs give focus trapping, Escape and the top layer for free (decision 003).
 */
export function openModal(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

export function closeModal(dialog: HTMLDialogElement): void {
  if (!dialog.open) return;
  if (typeof dialog.close === 'function') dialog.close();
  else {
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
  }
}

// React's autoFocus prop does not write the attribute, so `data-autofocus` is the way to pick the field.
const FIRST_FIELD = '[autofocus], [data-autofocus], input:not([type=hidden]), textarea, select';

/** The demo focuses the first form control, or the submit button when the dialog has no field. */
export function focusFirstField(dialog: HTMLElement): void {
  const target =
    dialog.querySelector<HTMLElement>(FIRST_FIELD) ??
    dialog.querySelector<HTMLElement>('button[type=submit]');
  target?.focus();
}
