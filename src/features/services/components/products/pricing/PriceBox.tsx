// PriceBox: one price cell of the grid. A box to type in (a 28 px input) with the server's words under it, or, for a role that may not change
// the price, just the figure. A cell that was changed is marked (a tinted box and the words "Unsaved") and a refused cell shows the
// server's message under the box. The lines under the box (the margin, the source of a shop price) are the server's figures, printed.
import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

export interface PriceBoxProps {
  /** The accessible name of the box ("Base price of EE UK Unlock"). */
  label: string;
  /** What the box shows now: what was typed, or the saved text. */
  value: string;
  /** The saved figure as the grid prints it, for a role that may not type. */
  figure: string;
  /** True when the box holds something that is not saved. */
  changed: boolean;
  /** A locked box shows the figure instead of an input; the title says why. */
  lock: { disabled: boolean; title?: string };
  /** The words in an empty box ("Base": the group follows the base price). */
  placeholder?: string;
  /** The server's words about this cell, shown under the box. */
  note?: string;
  /** The id of the note, so the box can point to it. */
  noteId: string;
  onChange: (text: string) => void;
  /** The lines under the box: the margin, the source of the shop price. Replaced by "Unsaved" while the box is changed. */
  children?: ReactNode;
}

/** The input, the lines under it and the note. */
export function PriceBox({
  label,
  value,
  figure,
  changed,
  lock,
  placeholder,
  note,
  noteId,
  onChange,
  children,
}: PriceBoxProps) {
  return (
    <div className="min-w-[5.5rem] whitespace-nowrap">
      {lock.disabled ? (
        <span className="block italic tabular-nums" title={lock.title}>
          {figure}
        </span>
      ) : (
        <input
          className={cx('input-sm w-24 tabular-nums', changed && 'border-accent bg-accent-soft')}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          aria-invalid={note ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          data-changed={changed ? 'true' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {changed ? <span className="cell-sub">Unsaved</span> : children}
      {note && (
        <span id={noteId} className="mt-0.5 block text-xs text-crit-fg">
          {note}
        </span>
      )}
    </div>
  );
}
