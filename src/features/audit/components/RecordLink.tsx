// RecordLink: the record an audit entry is about, as a link to its page when the staff member may open it (an order opens
// its drawer here), else as bold text. Ports `auditEntity` of 47-p-audit.js. A sign-in names no record, so it shows nothing.
import { Link } from 'react-router';
import { entityKind, recordText } from '../lib/entities';
import { recordTarget, type RecordAccess } from '../lib/link';
import type { AuditLog } from '../types';

export interface RecordLinkProps {
  row: AuditLog;
  /** Whether the staff member may open a page, and the Money view a record sits on (a hint only; the page checks again). */
  canOpen: RecordAccess;
  /** Opens an order's drawer on this page. */
  onOpenOrder: (orderId: number) => void;
}

export function RecordLink({ row, canOpen, onOpenOrder }: RecordLinkProps) {
  if (entityKind(row.entityType) === 'session') return null;
  const label = recordText(row);
  const target = recordTarget(row.entityType, row.entityId, row.entityLabel, row.account);
  if (!target) return <span className="font-medium">{label}</span>;
  if (target.page === 'orders') {
    if (!canOpen('orders')) return <span className="font-medium">{label}</span>;
    return (
      <button type="button" className="link" title="Open record" onClick={() => onOpenOrder(target.orderId)}>
        {label}
      </button>
    );
  }
  if (!canOpen(target.page, target.view)) return <span className="font-medium">{label}</span>;
  return (
    <Link className="link" to={target.to} title="Open record">
      {label}
    </Link>
  );
}
