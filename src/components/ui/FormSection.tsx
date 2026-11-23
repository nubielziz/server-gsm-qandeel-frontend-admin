// FormSection: a form frame for one section that saves and stays open (a SidePanelSection). FormDialog's sibling.
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { cx } from './cx';
import { errorText } from './errorText';
import { Icon } from './Icon';

/** How long "Saved" stays on screen. */
const SAVED_MS = 4000;

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
  const form = useRef<HTMLFormElement>(null);
  // A ref as well as state: two submits in the same tick would both see a stale `pending` state.
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const reasonId = useId();
  const blocked = submitDisabled || dirty === false;
  const reason = submitDisabled ? submitTitle : undefined;

  // Focus the first invalid field after React has rendered the failure, so a field that became invalid because of it
  // already carries aria-invalid.
  useEffect(() => {
    if (focusRequest) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  // The status clears itself; a new save starts a new timer because it clears `saved` first.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || blocked) return;
    running.current = true;
    setPending(true);
    setFailure(null);
    setSaved(false);
    const stay = (text: string | null) => {
      setFailure(text);
      setFocusRequest((n) => n + 1);
    };
    try {
      const result = await onSubmit(event);
      if (result === false) stay(null);
      else if (typeof result === 'string') stay(result);
      else setSaved(true);
    } catch (error) {
      stay(errorText(error));
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  return (
    <form ref={form} noValidate onSubmit={handleSubmit} className={cx('flex flex-col gap-3', className)}>
      {children}
      {/* Always in the DOM so screen readers announce the text when it appears. */}
      <p className={failure ? 'text-sm text-crit-fg' : 'hidden'} role="alert">
        {failure}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {/* The title sits on a wrapper: a disabled button takes no pointer events, so it would never show a tooltip. */}
        <span title={reason} className="inline-flex">
          <Button
            type="submit"
            loading={pending}
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
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 text-xs text-good-fg"
        >
          {saved && (
            <>
              <Icon name="check" className="ic-sm" />
              {savedText}
            </>
          )}
        </span>
      </div>
    </form>
  );
}
