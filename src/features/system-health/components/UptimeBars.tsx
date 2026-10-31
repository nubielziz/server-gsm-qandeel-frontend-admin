// UptimeBars: one thin cell per check bucket (ok, degraded, down; no check is a hairline outline) with a tooltip, arrow
// keys and an optional table view. No demo screen (docs/system-health-design.md, "Charts"); used by the Overview tab.
import { useRef, useState, type KeyboardEvent } from 'react';
import { clamp } from '@/components/charts';
import { cx } from '@/components/ui';
import { bucketClass, bucketFacts, bucketReadout, bucketSummary, bucketTime, bucketWord } from '../lib';
import type { CheckBucket } from '../types';
import { BarTooltip } from './BarTooltip';
import { TableViewToggle } from './TableViewToggle';
import { UptimeTable } from './UptimeTable';

export interface UptimeBarsProps {
  /** Oldest first, one per time bucket of `GET /admin/system/checks`. */
  buckets: readonly CheckBucket[];
  /** Bucket length in seconds (`ChecksResponse.bucketSeconds`), for the "14:00 to 14:15" time. */
  bucketSeconds?: number;
  /** Accessible name: what the bars show ("Postgres checks, last 24 hours"). The counts are added to it. */
  label: string;
  /** Adds a "Table view" toggle under the bars. Off in long lists, where it would repeat on every row. */
  withTable?: boolean;
  /** Sizes the strip, for example `w-56` in a table column. It is at least 10rem wide on its own. */
  className?: string;
}

// With more cells than this the 1px gaps would eat the cells themselves, so the strip is drawn without gaps.
const MAX_CELLS_WITH_GAP = 100;

/** The cell the tooltip points at, and the element to place it by. */
interface Cursor {
  index: number;
  cell: HTMLElement;
}

/**
 * Colour is never the only carrier of status: the bars have a name with the counts ("22 ok, 1 down"), a tooltip and a live
 * readout for every cell (pointer, or ArrowLeft/ArrowRight/Home/End on the focused bars), and a table view.
 */
export function UptimeBars({ buckets, bucketSeconds, label, withTable = false, className }: UptimeBarsProps) {
  const cells = useRef<(HTMLElement | null)[]>([]);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [table, setTable] = useState(false);
  const count = buckets.length;

  if (count === 0) return <span className="text-xs text-ink3">No data</span>;

  const summary = bucketSummary(buckets);
  const name = summary ? `${label}: ${summary}` : label;
  // The data can change under the cursor (a poll); a cursor past the end shows nothing.
  const active = cursor && cursor.index < count ? buckets[cursor.index] : null;

  function moveTo(index: number) {
    const cell = cells.current[index];
    if (cell) setCursor({ index, cell });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      if (!cursor) return;
      e.preventDefault();
      e.stopPropagation();
      setCursor(null);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const step = e.key === 'ArrowRight' ? 1 : -1;
      // From nowhere, ArrowRight starts at the oldest cell and ArrowLeft at the newest.
      e.preventDefault();
      moveTo(clamp((cursor?.index ?? (step > 0 ? -1 : count)) + step, 0, count - 1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      moveTo(e.key === 'Home' ? 0 : count - 1);
    }
  }

  return (
    <div className={className}>
      {table ? (
        <UptimeTable buckets={buckets} bucketSeconds={bucketSeconds} caption={name} />
      ) : (
        <div className="relative">
          <div
            role="img"
            aria-label={name}
            tabIndex={0}
            className={cx('flex h-6 min-w-[10rem] items-stretch', count <= MAX_CELLS_WITH_GAP && 'gap-px')}
            onKeyDown={onKeyDown}
            onBlur={() => setCursor(null)}
            onPointerLeave={() => setCursor(null)}
          >
            {buckets.map((bucket, index) => (
              <span
                key={bucket.start}
                ref={(cell) => {
                  cells.current[index] = cell;
                }}
                aria-hidden="true"
                className={cx(
                  'min-w-0 flex-1 rounded-[1px]',
                  bucketClass(bucket.status),
                  cursor && cursor.index !== index && 'opacity-45',
                )}
                onPointerEnter={(e) => setCursor({ index, cell: e.currentTarget })}
              />
            ))}
          </div>
          <div className="sr-only" aria-live="polite">
            {active ? bucketReadout(active, bucketSeconds) : ''}
          </div>
          {cursor && active && (
            <BarTooltip anchor={cursor.cell}>
              <div className="font-medium">{bucketWord(active)}</div>
              <div className="text-ink3">{bucketTime(active, bucketSeconds)}</div>
              {bucketFacts(active).map((fact) => (
                <div key={fact}>{fact}</div>
              ))}
            </BarTooltip>
          )}
        </div>
      )}
      {withTable && (
        <div className="mt-1 flex justify-end">
          <TableViewToggle pressed={table} onToggle={() => setTable((value) => !value)} />
        </div>
      )}
    </div>
  );
}
