// Test helper: jsdom has no HTMLDialogElement.showModal()/close() and no Escape handling for modal dialogs.
// Import it for its side effect in any test that renders Modal, FormDialog, ConfirmDialog, Drawer or CommandPalette.
// It is idempotent, and only the tests import it (the app never does).

const proto = HTMLDialogElement.prototype;

if (typeof proto.showModal !== 'function') {
  proto.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return;
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}

// Browsers answer Escape with a cancelable `cancel` event on the top-most modal dialog, then close it unless the
// page prevented it. A handler that already called preventDefault() on keydown stops the whole sequence.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const open = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
  const top = open[open.length - 1];
  if (!top) return;
  const cancel = new Event('cancel', { cancelable: true });
  top.dispatchEvent(cancel);
  if (!cancel.defaultPrevented) top.close();
});
