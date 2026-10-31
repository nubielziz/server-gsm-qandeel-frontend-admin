// WhenText: a time and its age on one line ("14:05 · 38m ago"), or a neutral "No data". Used by the Overview tab for the
// "since" column, the alert and incident start times and the deployed time (route group `health`).
import { whenParts } from './when';

export interface WhenTextProps {
  time: string | null | undefined;
  /** The clock of the screen (epoch ms), from `useNow`. */
  now: number;
  /** A word before the time ("Started"). It is left out together with the time when there is none. */
  label?: string;
  /** What to print when there is no time. Default: "No data". */
  empty?: string;
}

/**
 * The age is muted and the numbers are tabular, so a column of them lines up. The label stays with the time and the age
 * stays with both, so a narrow line breaks before "Started 11:03 · 22m ago", never inside it.
 */
export function WhenText({ time, now, label, empty = 'No data' }: WhenTextProps) {
  const parts = whenParts(time, now);
  if (!parts) return <span className="text-ink3">{empty}</span>;
  return (
    <span className="tabular-nums">
      <span className="whitespace-nowrap">
        {label && `${label} `}
        {parts.when}
      </span>
      <span className="whitespace-nowrap text-ink3">
        {' · '}
        {parts.ago}
      </span>
    </span>
  );
}
