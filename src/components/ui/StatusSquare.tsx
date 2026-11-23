// StatusSquare and SquareToggle: the small status square of a list row (green when on, hollow when off), plain or as a button.
import { cx } from './cx';

export type SquareTone = 'ok' | 'off' | 'warn' | 'crit';

const TONE_CLASS: Record<SquareTone, string> = {
  ok: 'status-sq-ok',
  off: 'status-sq-off',
  warn: 'status-sq-warn',
  crit: 'status-sq-crit',
};

export interface StatusSquareProps {
  tone: SquareTone;
  /** Spoken name of the state ("Active", "Switched off"); also the hover title. Status is never colour alone: off is hollow. */
  label: string;
}

/** A 10 px square. Put a word beside it when the state matters more than the row (the label is not visible). */
export function StatusSquare({ tone, label }: StatusSquareProps) {
  return <span className={cx('status-sq', TONE_CLASS[tone])} role="img" aria-label={label} title={label} />;
}

export interface SquareToggleProps {
  on: boolean;
  onToggle: () => void;
  /** What the square is about ("Active", "On the shop"). The state itself is aria-pressed, so keep it the same when it flips. */
  label: string;
  /** A change is being saved: the square pulses and a click does nothing (focus stays on it). */
  busy?: boolean;
  disabled?: boolean;
  /** Hover text. Default: the label. Give the server's reason here when the change is refused. */
  title?: string;
}

/** The same square as a toggle button, with a 24 px target around it. */
export function SquareToggle({
  on,
  onToggle,
  label,
  busy = false,
  disabled = false,
  title,
}: SquareToggleProps) {
  return (
    <button
      type="button"
      className="square-toggle"
      aria-pressed={on}
      aria-label={label}
      aria-busy={busy || undefined}
      title={title ?? label}
      disabled={disabled}
      onClick={() => {
        if (!busy) onToggle();
      }}
    >
      <span
        className={cx('status-sq', on ? 'status-sq-ok' : 'status-sq-off', busy && 'animate-pulse')}
        aria-hidden="true"
      />
    </button>
  );
}
