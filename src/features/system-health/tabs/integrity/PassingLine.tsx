// PassingLine: the one quiet line that stands for the checks that passed ("3 checks passed · Show"), so a problem is not
// buried under rows that say nothing. Part of the Integrity tab (route group health). No demo screen.
import { Icon } from '@/components/ui';

export interface PassingLineProps {
  /** How many checks passed. */
  passed: number;
  /** True when every check passed, so the line says "All 4 checks passed". */
  all: boolean;
  /** The passed checks are listed in the table above. */
  open: boolean;
  onToggle: () => void;
}

/** The icon and the words say "passed"; the tone is only support. Show and Hide are a real button with `aria-expanded`. */
export function PassingLine({ passed, all, open, onToggle }: PassingLineProps) {
  const text = `${all ? 'All ' : ''}${passed} ${passed === 1 ? 'check' : 'checks'} passed`;
  return (
    <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 text-sm text-ink2 first:border-t-0">
      <Icon name="checkCircle" className="ic-sm shrink-0 text-good-fg" />
      <span>{text}</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="link"
        aria-expanded={open}
        aria-label={open ? 'Hide the passed checks' : 'Show the passed checks'}
        onClick={onToggle}
      >
        {open ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
