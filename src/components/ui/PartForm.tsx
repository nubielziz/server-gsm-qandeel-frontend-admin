// PartForm: the frame of a part of a record's edit view that is a form saved as a whole: the fields, an error slot, and the one primary
// button ("Save") in the bar pinned to the foot of the view, with "Saved" beside it (the layout the owner asked for: each part is saved on
// its own button). The record's parts may belong to several features, so the frame lives in the kit.
import { useId, type FormEvent, type ReactNode } from 'react';
import { SaveBar } from './SaveBar';
import { useSaveFlow } from './useSaveFlow';

export interface PartFormProps {
  /**
   * Runs on submit, with the same results as FormSection's: `undefined` or `true` = saved; `false` = not saved, the fields show their own
   * errors; a string = not saved, that text goes in the error slot; a throw = not saved, the error's text goes there. `dialogSubmit(...)`
   * plugs in as it does for a dialog.
   */
  onSubmit: (event: FormEvent<HTMLFormElement>) => unknown;
  /** False while nothing changed: the button is off, because there is nothing to save. */
  dirty: boolean;
  /** Names the form for assistive technology (the part's name, such as "Set Pricing"). */
  label?: string;
  /** The button's words. Default "Save". */
  submitLabel?: string;
  /** A missing permission: the button is off and the reason is said beside it. */
  lock?: { disabled: boolean; title?: string };
  /** What the live region says after a save. */
  savedText?: string;
  children: ReactNode;
}

/**
 * A `<form noValidate>` with its fields, then the pinned bar. The two sit in a `view-frame`, so a short part still ends with its bar at the
 * foot of the window. While the handler runs the button shows a spinner and a second submit is ignored; after a failure focus moves to the
 * first field marked invalid.
 */
export function PartForm({
  onSubmit,
  dirty,
  label,
  submitLabel = 'Save',
  lock,
  savedText = 'Saved',
  children,
}: PartFormProps) {
  const formId = useId();
  const flow = useSaveFlow();
  const locked = lock?.disabled === true;
  const blocked = locked || !dirty;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    void flow.run(() => onSubmit(event));
  }

  return (
    <div className="view-frame">
      <form
        id={formId}
        ref={flow.formRef}
        noValidate
        aria-label={label}
        onSubmit={handleSubmit}
        className="min-w-0"
      >
        {children}
        {/* Always in the DOM so screen readers announce the text when it appears. */}
        <p className={flow.failure ? 'mt-3 text-sm text-crit-fg' : 'hidden'} role="alert">
          {flow.failure}
        </p>
      </form>
      <SaveBar
        form={formId}
        label={submitLabel}
        pending={flow.pending}
        saved={flow.saved}
        savedText={savedText}
        disabled={blocked}
        reason={locked ? lock?.title : undefined}
      />
    </div>
  );
}
