// AuditRow: one entry of the audit list: the time, who did what to which record, a one-line summary of the first change and
// the button that opens the before / after. Ports one row of pageAudit in 47-p-audit.js (aud-toggle).
import { Avatar, Button, cx, Icon } from '@/components/ui';
import { fmtDate, fmtTime } from '@/lib/format';
import { actorText } from '../lib/actor';
import { diffOf, valueText } from '../lib/diff';
import type { RecordPage } from '../lib/link';
import { actionText, auditCode } from '../lib/verb';
import type { AuditLog } from '../types';
import { AuditDetails } from './AuditDetails';
import { RecordLink } from './RecordLink';

export interface AuditRowProps {
  row: AuditLog;
  open: boolean;
  onToggle: (id: number) => void;
  role: string | undefined;
  canOpen: (page: RecordPage) => boolean;
  onOpenOrder: (orderId: number) => void;
}

// "status: processing → completed +1 more": the first change, the old value struck through.
function Summary({ row }: { row: AuditLog }) {
  const lines = diffOf(row.before, row.after);
  const first = lines.at(0);
  if (!first) return null;
  const from = valueText(first.from);
  return (
    <p className="mt-0.5 truncate">
      <span className="text-xs text-ink3">
        {first.field}: {from && <span className="line-through">{from}</span>}
        {from && ' → '}
        <span className="text-ink2">{valueText(first.to)}</span>
        {lines.length > 1 && ` +${lines.length - 1} more`}
      </span>
    </p>
  );
}

export function AuditRow({ row, open, onToggle, role, canOpen, onOpenOrder }: AuditRowProps) {
  const code = auditCode(row.id);
  const actor = actorText(row);
  const detailsId = `audit-details-${row.id}`;
  return (
    <li className="border-b border-line px-3.5 py-2.5 last:border-b-0">
      <div className="flex items-start gap-3">
        <time
          dateTime={row.createdAt}
          className="mono w-[44px] flex-none pt-0.5 tabular-nums text-ink3 sm:w-[124px]"
        >
          <span className="sm:hidden">{fmtTime(row.createdAt)}</span>
          <span className="hidden sm:inline">{fmtDate(row.createdAt)}</span>
        </time>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="inline-flex items-center gap-1.5 align-middle">
              <Avatar name={actor} />
              <span className="font-medium">{actor}</span>
            </span>{' '}
            {actionText(row.action)} <RecordLink row={row} canOpen={canOpen} onOpenOrder={onOpenOrder} />
          </p>
          <Summary row={row} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon
          className="-my-0.5 flex-none"
          aria-expanded={open}
          aria-controls={open ? detailsId : undefined}
          aria-label={`${open ? 'Hide' : 'Show'} details for ${code}`}
          onClick={() => onToggle(row.id)}
        >
          <Icon name="chevD" className={cx('ic-sm transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      {open && <AuditDetails id={detailsId} row={row} role={role} />}
    </li>
  );
}
