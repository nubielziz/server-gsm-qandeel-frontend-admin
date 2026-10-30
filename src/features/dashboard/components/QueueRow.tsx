// QueueRow: one service type of "Open queue by type": its counts, the bar split into on time, needs review and past SLA, and
// the age of the oldest order. Ports the `<li>` of queuePanel() in 40-p-dashboard.js; a link to that queue when `to` is given.
import { ageText } from '@/lib/format';
import { Link } from 'react-router';
import { Badge, TypeTag } from '@/components/ui';
import { TYPE_LABEL } from '@/features/orders';
import type { QueueByType } from '../types';

// One segment of the bar: its share is the flex ratio, so the segments always fill the track.
const segment = (count: number, color: string) =>
  count > 0 ? <i style={{ flex: `${count} 1 0`, background: `rgb(var(--${color}))` }} /> : null;

export interface QueueRowProps {
  queue: QueueByType;
  /** Where the row leads, or `undefined` when the staff member may not open Orders (the row is then plain). */
  to: string | undefined;
  /** The moment the oldest order's age is measured from. */
  now: number;
}

/** A row of the queue list. A type this console does not know (a newer server) shows under its raw name. */
export function QueueRow({ queue, to, now }: QueueRowProps) {
  const label = TYPE_LABEL[queue.type] ?? queue.type;
  const onTime = Math.max(0, queue.open - queue.review - queue.pastSla);
  const summary = `${label}: ${queue.open} open, ${queue.review} need review, ${queue.pastSla} past SLA.`;
  const body = (
    <>
      <div className="flex items-center gap-2">
        <TypeTag>{label}</TypeTag>
        <span className="text-sm font-medium tabular-nums">{queue.open} open</span>
        <span className="flex-1" />
        {queue.pastSla > 0 && (
          <Badge tone="crit" icon="clock">
            {queue.pastSla} late
          </Badge>
        )}
        {queue.review > 0 && (
          <Badge tone="serious" icon="alert">
            {queue.review} review
          </Badge>
        )}
      </div>
      <div className="qbar mt-2" role="presentation">
        {segment(onTime, 'neutral-dot')}
        {segment(queue.review, 'serious-dot')}
        {segment(queue.pastSla, 'crit-dot')}
      </div>
      <p className="mt-1 text-xs text-ink3">
        {queue.open > 0 && queue.oldestCreatedAt
          ? `Oldest ${ageText(now - Date.parse(queue.oldestCreatedAt))}`
          : 'Queue is empty'}
      </p>
    </>
  );
  return (
    <li>
      {to ? (
        <Link
          className="block w-full px-3.5 py-2.5 text-start hover:bg-hover"
          to={to}
          aria-label={`${summary} Open the queue`}
        >
          {body}
        </Link>
      ) : (
        <div className="px-3.5 py-2.5" role="group" aria-label={summary}>
          {body}
        </div>
      )}
    </li>
  );
}
