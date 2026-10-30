// AuditList: the entries grouped by day, each day under a sticky heading, with the "Show more" button that loads the next
// page. Ports the list body of pageAudit in 47-p-audit.js (aud-more). Which entries are open is kept here, as the demo's
// `ui.audit.open` did.
import { useState } from 'react';
import { Button } from '@/components/ui';
import { num, useNow } from '@/lib/format';
import { groupByDay } from '../lib/days';
import type { RecordPage } from '../lib/link';
import { AUDIT_PAGE_SIZE } from '../lib/view';
import type { AuditLog } from '../types';
import { AuditRow } from './AuditRow';

export interface AuditListProps {
  rows: readonly AuditLog[];
  /** How many entries match in all, from the server. */
  total: number | undefined;
  hasMore: boolean;
  loadingMore: boolean;
  /** True when loading the next page failed; the entries already loaded stay. */
  moreFailed: boolean;
  onMore: () => void;
  roleOf: (actorId: number | null) => string | undefined;
  canOpen: (page: RecordPage) => boolean;
  onOpenOrder: (orderId: number) => void;
}

export function AuditList({
  rows,
  total,
  hasMore,
  loadingMore,
  moreFailed,
  onMore,
  roleOf,
  canOpen,
  onOpenOrder,
}: AuditListProps) {
  const now = useNow(60_000);
  const [openIds, setOpenIds] = useState<ReadonlySet<number>>(new Set());
  const toggle = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const remaining = Math.max(0, (total ?? rows.length) - rows.length);

  return (
    <div>
      {groupByDay(rows, now).map((day) => (
        <div key={day.key}>
          <h2 className="sticky top-12 z-[1] border-y border-line bg-sunken px-3.5 py-1.5 text-xs font-medium text-ink2 first:border-t-0">
            {day.label}
          </h2>
          <ul>
            {day.rows.map((row) => (
              <AuditRow
                key={row.id}
                row={row}
                open={openIds.has(row.id)}
                onToggle={toggle}
                role={roleOf(row.actorId)}
                canOpen={canOpen}
                onOpenOrder={onOpenOrder}
              />
            ))}
          </ul>
        </div>
      ))}
      {hasMore && (
        <div className="border-t border-line p-3 text-center">
          {moreFailed && (
            <p role="alert" className="mb-2 text-xs text-crit-fg">
              Could not load more entries.
            </p>
          )}
          {/* Not disabled while loading: a disabled button loses the keyboard focus, and the person would start over. */}
          <Button onClick={onMore} aria-busy={loadingMore || undefined}>
            {moreFailed ? (
              'Try again'
            ) : (
              <>
                Show {Math.min(AUDIT_PAGE_SIZE, remaining)} more{' '}
                <span className="text-ink3">of {num(remaining)} remaining</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
