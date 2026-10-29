// Timeline: vertical event history with a coloured node per event. Ports timeline(events) of 20-ui.js.
import type { ReactNode } from 'react';

export type TimelineKind = 'completed' | 'settle' | 'review' | 'rejected' | 'release' | 'retry';

export interface TimelineEvent {
  id?: string | number;
  /** ISO string from the API, epoch milliseconds or a Date. */
  at: string | number | Date;
  /** Picks the node colour; anything else (or nothing) is neutral grey. */
  kind?: TimelineKind;
  text: ReactNode;
  /** Who did it (an admin name, "system", the supplier). */
  by?: string;
}

export interface TimelineProps {
  events: readonly TimelineEvent[];
  /** Formats the time label. Default is the demo's "05 Oct, 14:32". */
  formatTime?: (at: Date) => string;
}

// Full class names so Tailwind can see them.
const NODE_CLASS: Record<TimelineKind, string> = {
  completed: 'bg-good-dot',
  settle: 'bg-good-dot',
  review: 'bg-serious-dot',
  rejected: 'bg-crit-dot',
  release: 'bg-neutral-dot',
  retry: 'bg-warn-dot',
};

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
const defaultFormat = (at: Date) => `${DAY_FORMAT.format(at)}, ${TIME_FORMAT.format(at)}`;
const isValid = (date: Date) => !Number.isNaN(date.getTime());

/** Oldest first, like the demo, so the story reads top to bottom. */
export function Timeline({ events, formatTime = defaultFormat }: TimelineProps) {
  // An unparseable date must not break the whole history: it sorts last and shows a dash.
  const millis = (date: Date) => (isValid(date) ? date.getTime() : Infinity);
  const sorted = events
    .map((event) => ({ event, date: new Date(event.at) }))
    .sort((a, b) => (millis(a.date) === millis(b.date) ? 0 : millis(a.date) < millis(b.date) ? -1 : 1));
  return (
    <ol className="relative ms-1.5 border-s border-line2">
      {sorted.map(({ event, date }, i) => (
        <li key={event.id ?? i} className="relative pb-3.5 ps-4 last:pb-0">
          <span
            className={`absolute -start-[4.5px] top-[5px] h-2 w-2 rounded-full ring-2 ring-surface ${
              (event.kind && NODE_CLASS[event.kind]) || 'bg-neutral-dot'
            }`}
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <time
              className="mono tabular-nums text-ink3"
              dateTime={isValid(date) ? date.toISOString() : undefined}
            >
              {isValid(date) ? formatTime(date) : '–'}
            </time>
            <span className="text-sm">{event.text}</span>
          </div>
          {event.by && <div className="text-xs text-ink3">{event.by}</div>}
        </li>
      ))}
    </ol>
  );
}
