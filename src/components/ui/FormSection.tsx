// FormSection: a form frame for one section that saves and stays open (one part of a record's edit view). FormDialog's sibling.
import { useId, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './cx';
import { SavedStatus } from './SaveNote';
import { useSaveFlow } from './useSaveFlow';

export interface FormSectionProps {
  /**
   * Runs on submit. Same meaning as FormDialog's: `undefined`, `true` or any other value = saved; `false` = not saved,
   * the form showed the field errors itself; a string = not saved, that text goes in the error slot; a throw = not
   * saved, the error's text goes in the error slot. It also gets the submit event, so `dialogSubmit(...)` and
   * `submitUnlessInvalid(...)` plug in as they do for FormDialog.
   */
  onSubmit: (event: FormEvent<HTMLFormElement>) => unknown | Promise<unknown>;
  submitLabel?: string;
  /** Keeps the button off, for example for a missing permission. Give the reason in `submitTitle`. */
  submitDisabled?: boolean;
  /** The reason the button is disabled by `submitDisabled`: a tooltip, and a description for screen readers. */
  submitTitle?: string;
  /** When given and false the button is off: there is nothing to save. */
  dirty?: boolean;
  /** What the live region says after a save. */
  savedText?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A `<form noValidate>` with the fields, an error slot (role="alert") and a row with the Save button and a polite
 * "Saved" status. Unlike FormDialog it stays mounted after a save. While the handler runs the button shows a spinner
 * and a second submit (button, Enter) is ignored. After a failure focus moves to the first field marked aria-invalid.
 * The button is not the primary style: a panel has several sections and the ink-black button is one per surface.
 */
export function FormSection({
  onSubmit,
  submitLabel = 'Save',
  submitDisabled = false,
  submitTitle,
  dirty,
  savedText = 'Saved',
  children,
  className,
}: FormSectionProps) {
  const flow = useSaveFlow();
  const reasonId = useId();
  const blocked = submitDisabled || dirty === false;
  const reason = submitDisabled ? submitTitle : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    void flow.run(() => onSubmit(event));
  }

  return (
    <form
      ref={flow.formRef}
      noValidate
      onSubmit={handleSubmit}
      className={cx('flex flex-col gap-3', className)}
    >
      {children}
      {/* Always in the DOM so screen readers announce the text when it appears. */}
      <p className={flow.failure ? 'text-sm text-crit-fg' : 'hidden'} role="alert">
        {flow.failure}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {/* The title sits on a wrapper: a disabled button takes no pointer events, so it would never show a tooltip. */}
        <span title={reason} className="inline-flex">
          <Button
            type="submit"
            loading={flow.pending}
            disabled={blocked}
            aria-describedby={reason ? reasonId : undefined}
          >
            {submitLabel}
          </Button>
        </span>
        {reason && (
          <span id={reasonId} className="sr-only">
            {reason}
          </span>
        )}
        <SavedStatus saved={flow.saved} text={savedText} />
      </div>
    </form>
  );
}
