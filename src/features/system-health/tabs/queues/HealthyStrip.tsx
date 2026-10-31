// HealthyStrip: the quiet line on top of a table of the Queues & jobs tab. On the left what the card holds; on the right how
// many healthy rows are folded away, with Show / Hide (design: "healthy rows collapse into one quiet line").
import type { ReactNode } from 'react';
import { countOf } from './text';

export interface HealthyStripProps {
  /** What the card holds ("8 queues · Oldest queued job 3m 12s"). */
  children: ReactNode;
  /** How many healthy rows are folded away, or shown when expanded. 0 leaves the right side out. */
  healthy: number;
  /** The word for one row ("queue", "job", "direction"). */
  noun: string;
  /** True when no row needs a look, so the line reads "All 8 queues healthy". */
  all: boolean;
  expanded: boolean;
  onToggle: () => void;
}

/** The button names what it shows or hides ("Show 6 healthy queues") for screen readers; the text stays "Show". */
export function HealthyStrip({ children, healthy, noun, all, expanded, onToggle }: HealthyStripProps) {
  const rows = countOf(healthy, noun);
  return (
    // The hairline below only when a table follows; the card's own border closes a card that is just this line.
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-line px-3.5 py-1.5 text-xs text-ink3 [&:not(:last-child)]:border-b">
      <span className="inline-flex flex-wrap items-center gap-x-2">{children}</span>
      {healthy > 0 && (
        <span className="inline-flex items-center gap-x-1.5">
          {all ? `All ${rows} healthy` : `${rows} healthy`}
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className="link"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Hide' : 'Show'} ${countOf(healthy, `healthy ${noun}`)}`}
            onClick={onToggle}
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        </span>
      )}
    </div>
  );
}
