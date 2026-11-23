// SaveBar: the pinned bar of a form that saves as a whole (a part of an edit view): one primary button on the left, the reason it is off for a
// missing permission, "Saved" and, when the bar holds it, the failure beside it (the layout the owner asked for: one primary button per view,
// in a pinned bar).
import { useId } from 'react';
import { Button } from './Button';
import { PinnedBar } from './PinnedBar';
import { SavedStatus, SaveFailure } from './SaveNote';

export interface SaveBarProps {
  /** The save is running: the button shows a spinner and ignores clicks. */
  pending: boolean;
  /** The last save worked; the words stay for a few seconds. */
  saved: boolean;
  /** Nothing to save, or the staff member may not: the button is off. */
  disabled: boolean;
  /** Why the button is off for a missing permission: said beside it, as a tooltip and as the button's description. */
  reason?: string;
  /** Why the last save failed, in the server's words. Leave it out when the form shows the failure itself. */
  failure?: string | null;
  /** The button's words. Default "Save". */
  label?: string;
  /** What the live region says after a save. */
  savedText?: string;
  /** The id of the form the button submits, when the bar sits outside it. */
  form?: string;
}

/** A submit button in a PinnedBar; put it last in the `<form>`, or after it with `form`. */
export function SaveBar({
  pending,
  saved,
  disabled,
  reason,
  failure,
  label = 'Save',
  savedText,
  form,
}: SaveBarProps) {
  const reasonId = useId();
  return (
    <PinnedBar>
      {/* The title sits on a wrapper: a disabled button takes no pointer events, so it would never show a tooltip. */}
      <span title={reason} className="inline-flex">
        <Button
          type="submit"
          form={form}
          variant="primary"
          loading={pending}
          disabled={disabled}
          aria-describedby={reason ? reasonId : undefined}
        >
          {label}
        </Button>
      </span>
      {reason && (
        <span id={reasonId} className="text-xs text-ink3">
          {reason}
        </span>
      )}
      <SavedStatus saved={saved} text={savedText} />
      {failure !== undefined && <SaveFailure failure={failure} inline />}
    </PinnedBar>
  );
}
