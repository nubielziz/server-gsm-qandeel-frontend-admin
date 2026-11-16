// SelectAllBox: a labelled tick box with the three states of "select all" (none, some, all) for a set bigger than the rows on screen.
// The import picker's "Select all not imported" and Quick add's "Select all groups" use it.
import type { ReactNode } from 'react';
import { IndeterminateCheckbox } from '@/components/ui';

export interface SelectAllBoxProps {
  label: ReactNode;
  /** `some` shows the dash; `all` shows the tick. */
  state: 'none' | 'some' | 'all';
  /** The reason it cannot be used, shown as the tooltip. */
  title?: string;
  disabled?: boolean;
  /**
   * The ids are being read. The box stays focusable (a disabled box would drop the keyboard focus inside the dialog) and says
   * it is busy; clicks are ignored until the read ends.
   */
  busy?: boolean;
  /** Called with the new tick: true to pick everything, false to take everything out. */
  onChange: (on: boolean) => void;
}

/** A tick box of its own, apart from the table's header box, which ticks only the rows it shows. */
export function SelectAllBox({
  label,
  state,
  title,
  disabled = false,
  busy = false,
  onChange,
}: SelectAllBoxProps) {
  const idle = disabled || busy;
  return (
    <label
      className={`flex items-center gap-2 text-sm ${idle ? 'cursor-default' : 'cursor-pointer'}`}
      title={title}
    >
      <IndeterminateCheckbox
        checked={state === 'all'}
        indeterminate={state === 'some'}
        disabled={disabled}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        // The reason also on the input: assistive technology does not read a label's title for its control.
        title={title}
        onChange={(event) => {
          if (!busy) onChange(event.target.checked);
        }}
      />
      <span>{label}</span>
    </label>
  );
}
