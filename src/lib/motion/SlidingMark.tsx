// SlidingMark: the one element a row of tabs or links draws its selected look with; useSlidingIndicator moves it (see slidingIndicator.ts).

export interface SlidingMarkProps {
  /** Its look (the colours and shape of the selected item), next to the `slide-mark` class that places and moves it. */
  className: string;
  /** The tag: `li` inside a `ul`, `span` anywhere else. */
  as?: 'span' | 'li';
}

/** Put it first in the row, so the items (positioned) paint above it. It is hidden from assistive technology. */
export function SlidingMark({ className, as: Tag = 'span' }: SlidingMarkProps) {
  return (
    <Tag
      data-slide-mark=""
      aria-hidden="true"
      role={Tag === 'li' ? 'presentation' : undefined}
      className={`slide-mark ${className}`}
    />
  );
}
