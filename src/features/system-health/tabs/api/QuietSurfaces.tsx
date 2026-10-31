// QuietSurfaces: the one quiet line under the surfaces table that holds the healthy surfaces ("4 surfaces OK · Show").
import type { Ref } from 'react';
import { num } from '@/lib/format';

export interface QuietSurfacesProps {
  /** How many healthy surfaces the line holds. */
  count: number;
  expanded: boolean;
  onToggle: () => void;
  /** The Show / Hide button, so the card can put the keyboard on it when the surface the keyboard was on folds away. */
  toggleRef?: Ref<HTMLButtonElement>;
}

/** Problems come first; the surfaces that are fine wait behind "Show" so the eye stays on what needs it. */
export function QuietSurfaces({ count, expanded, onToggle, toggleRef }: QuietSurfacesProps) {
  return (
    <p className="m-0 border-t border-line px-3.5 py-2 text-xs text-ink3">
      {num(count)} {count === 1 ? 'surface' : 'surfaces'} OK ·{' '}
      <button type="button" ref={toggleRef} className="link" aria-expanded={expanded} onClick={onToggle}>
        {expanded ? 'Hide' : 'Show'}
      </button>
    </p>
  );
}
