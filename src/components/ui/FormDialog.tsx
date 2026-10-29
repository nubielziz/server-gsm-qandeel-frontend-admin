// FormDialog: Modal + <form> with Cancel/Confirm, an async submit and a pending state. Ports modal({ onSubmit }).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from './Button';
import { errorText } from './errorText';
import { Modal, type ModalProps } from './Modal';

/**
 * What a submit handler may return. `undefined` or `true` closes the dialog; `false` keeps it open;
 * a string keeps it open and shows the text in the error slot (the demo's validation-message flow).
 * Throwing keeps it open and shows the error's message.
 */
export type FormDialogResult = void | boolean | string;

export interface FormDialogProps extends Omit<ModalProps, 'footer' | 'onSubmit' | 'error' | 'dismissible'> {
  /** Label of the confirm button. */
  confirm?: string;
  cancel?: string;
  /** `danger` makes the confirm button the solid critical fill. */
  kind?: 'primary' | 'danger';
  onSubmit: (event: FormEvent<HTMLFormElement>) => FormDialogResult | Promise<FormDialogResult>;
  /** An error that lives outside the dialog (a mutation's error) and should show in the slot. */
  error?: string | null;
  /** Pending state that lives outside the dialog (a mutation's isPending). */
  pending?: boolean;
}

/**
 * While the handler runs the confirm button is disabled with a spinner and the dialog cannot be dismissed,
 * so a money-moving action cannot be sent twice or dismissed unseen. After a failure focus moves to the
 * first field marked aria-invalid, as in the demo. For react-hook-form wrap the handler with
 * submitUnlessInvalid() so a failed validation does not close the dialog.
 */
export function FormDialog({
  confirm = 'Confirm',
  cancel = 'Cancel',
  kind = 'primary',
  onSubmit,
  error,
  pending = false,
  onClose,
  open,
  children,
  ...modalProps
}: FormDialogProps) {
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [focusRequest, setFocusRequest] = useState(0);
  const failedForm = useRef<HTMLFormElement | null>(null);
  // Reset between openings while rendering, the React way to react to a prop change.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setFailure(null);
  }
  const busy = running || pending;

  // Focus the first invalid field after React has rendered the failure, so fields that become invalid because
  // of it (an error prop set in the same batch) already carry aria-invalid.
  useEffect(() => {
    if (focusRequest) failedForm.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const refocus = () => {
      failedForm.current = form;
      setFocusRequest((n) => n + 1);
    };
    setFailure(null);
    setRunning(true);
    try {
      const result = await onSubmit(event);
      if (result === false) refocus();
      else if (typeof result === 'string') {
        setFailure(result);
        refocus();
      } else onClose();
    } catch (err) {
      setFailure(errorText(err));
      refocus();
    } finally {
      setRunning(false);
    }
  }

  return (
    <Modal
      {...modalProps}
      open={open}
      onClose={onClose}
      dismissible={!busy}
      error={failure ?? error}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button disabled={busy} onClick={() => onClose()}>
            {cancel}
          </Button>
          <Button type="submit" variant={kind === 'danger' ? 'danger-solid' : 'primary'} loading={busy}>
            {confirm}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
