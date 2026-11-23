// SectionForm: one section of a record's part that saves on its own and stays open: a <form> with the section's label-left rows, then the row
// with its button, "Saved" and the failure line, as the layout the owner asked for draws a section's own button under its controls. Each
// section is its own form, so pressing Enter or the button sends that section alone. FormSection's sibling for label-left rows.
import { useId, type FormEvent, type ReactNode } from 'react';
import { Button } from './Button';
import { FormRow } from './FormRow';
import { SavedStatus, SaveFailure } from './SaveNote';
import { useSaveFlow } from './useSaveFlow';

/** What a control that needs a permission takes: off, with the missing permission named in its title. */
export type PermissionLock = { disabled: boolean; title?: string };

export interface SectionFormProps {
  /** Names the form for assistive technology, such as "Quantity Field". */
  label?: string;
  /** The save; its result is read as a FormSection's is (`outcomeOf`): `dialogSubmit(...)` plugs in as it is. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => unknown;
  /** The button's words. Default "Save". */
  submitLabel?: string;
  /** When given and false the button is off: there is nothing to save. */
  dirty?: boolean;
  /** A missing permission: the button is off, with the reason as its tooltip and description. */
  lock?: PermissionLock;
  /** Other buttons that belong before the save button (an "Add a field" button). */
  actions?: ReactNode;
  /** `control` puts the button row in the control column of label-left rows; `edge` puts it at the left edge, under a table. */
  placement?: 'control' | 'edge';
  /** What the live region says after a save. */
  savedText?: string;
  children: ReactNode;
}

/** The form, its failure line and its row of buttons. While a save runs the button shows a spinner and a second submit is ignored. */
export function SectionForm({
  label,
  onSubmit,
  submitLabel = 'Save',
  dirty,
  lock,
  actions,
  placement = 'control',
  savedText,
  children,
}: SectionFormProps) {
  const flow = useSaveFlow();
  const reasonId = useId();
  const reason = lock?.disabled ? lock.title : undefined;
  const blocked = lock?.disabled === true || dirty === false;
  const footer = (
    <>
      <SaveFailure failure={flow.failure} />
      <div className="flex flex-wrap items-center gap-3">
        {actions}
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
    </>
  );
  return (
    <form
      ref={flow.formRef}
      noValidate
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        if (blocked) return;
        void flow.run(() => onSubmit(event));
      }}
    >
      {children}
      {placement === 'control' ? (
        <FormRow label={null}>{footer}</FormRow>
      ) : (
        <div className="mt-3">{footer}</div>
      )}
    </form>
  );
}
