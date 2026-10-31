// QuietLine: the one quiet line that stands for the healthy items a card folds away ("11 components operational ·
// Show"). Every tab uses it, so the pattern looks and reads the same on the whole page (design: problems first, healthy
// items collapsed). No demo screen.
import type { Ref } from 'react';
import { cx } from '@/components/ui';

export interface QuietLineProps {
  /** The folded items as a short sentence: "11 components operational", "3 checks passed". */
  text: string;
  /** What Show and Hide act on, for screen readers: "the operational components". */
  what: string;
  /** True while the folded items are shown. */
  open: boolean;
  onToggle: () => void;
  /** A list stands above the line, so a hairline separates them. */
  divided?: boolean;
  /** Id of the list the button shows and hides. */
  controls?: string;
  /** The toggle itself, so a card can move the keyboard to it when the row that had it folds away. */
  toggleRef?: Ref<HTMLButtonElement>;
}

/**
 * Muted text and a link-style button: not an alarm and not a green banner. The button reads "Show" or "Hide" and is
 * named "Show the operational components" for screen readers; `aria-expanded` carries the state.
 */
export function QuietLine({
  text,
  what,
  open,
  onToggle,
  divided = false,
  controls,
  toggleRef,
}: QuietLineProps) {
  return (
    <p
      className={cx(
        'm-0 flex flex-wrap items-center gap-x-1.5 px-3.5 py-2 text-xs text-ink3',
        divided && 'border-t border-line',
      )}
    >
      <span>{text}</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        ref={toggleRef}
        className="link"
        aria-expanded={open}
        aria-controls={controls}
        onClick={onToggle}
      >
        {open ? 'Hide' : 'Show'}
        <span className="sr-only"> {what}</span>
      </button>
    </p>
  );
}
