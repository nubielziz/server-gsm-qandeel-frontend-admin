// QuietLine: the one quiet line that stands for the healthy items of a list ("5 suppliers healthy · Show"). Problems come
// first; healthy items stay out of the way until someone asks. Used by the Suppliers card of the Orders & suppliers tab.
import { useId } from 'react';
import { Button, Icon, cx } from '@/components/ui';

export interface QuietLineProps {
  /** What the hidden items are: "5 suppliers healthy · 1 disabled". */
  text: string;
  /** True while the healthy items are shown (the caller adds them to the list above the line). */
  open: boolean;
  onToggle: () => void;
  /** True when a table sits above the line, so the line starts with a hairline. */
  separated: boolean;
}

/**
 * The button's name stays "Show" or "Hide" (what it says); the sentence beside it is its description, so a screen reader
 * hears what is shown. The chevron is a hint that the line opens and closes. `aria-expanded` carries the state.
 */
export function QuietLine({ text, open, onToggle, separated }: QuietLineProps) {
  const textId = useId();
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 px-3.5 py-2',
        separated && 'border-t border-line',
      )}
    >
      <p id={textId} className="min-w-0 text-sm text-ink2">
        {text}
      </p>
      <Button size="sm" variant="ghost" aria-expanded={open} aria-describedby={textId} onClick={onToggle}>
        {open ? 'Hide' : 'Show'}
        <Icon name={open ? 'chevU' : 'chevD'} className="ic-sm" />
      </Button>
    </div>
  );
}
