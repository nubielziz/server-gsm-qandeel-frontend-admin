// ReadOnlyNote: the one quiet line shown when the staff member holds none of the write permissions of System health, so the
// missing action buttons are explained (docs/system-health-design.md, "Controls and confirmation").
import { Icon } from '@/components/ui';

/** Shown instead of dead buttons: with read-only access the page draws no action at all. */
export function ReadOnlyNote() {
  return (
    <p className="mb-4 flex items-start gap-2 text-xs text-ink3" role="note">
      <Icon name="lock" className="ic-sm mt-px flex-none" />
      <span>
        You have read-only access here, so the action buttons are hidden. Ask an administrator if you need to
        change something.
      </span>
    </p>
  );
}
