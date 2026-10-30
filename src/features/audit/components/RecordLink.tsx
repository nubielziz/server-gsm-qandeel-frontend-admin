// RecordLink: the record an audit entry is about, as a link to its page when the staff member may open it (an order opens
// its drawer here), else as bold text. Ports `auditEntity` of 47-p-audit.js. A sign-in names no record, so it shows nothing.
import { Link } from 'react-router';
import { entityKind, recordText } from '../lib/entities';
import { recordTarget, type RecordPage } from '../lib/link';
import type { AuditLog } from '../types';

export interface RecordLinkProps {
  row: AuditLog;
  /** Whether the staff member may open a page (a hint only; the page checks again). */
  canOpen: (page: RecordPage) => boolean;
  /** Opens an order's drawer on this page. */
  onOpenOrder: (orderId: number) => void;
}

export function RecordLink({ row, canOpen, onOpenOrder }: RecordLinkProps) {
  if (entityKind(row.entityType) === 'session') return null;
  const label = recordText(row);
  const target = recordTarget(row.entityType, row.entityId, row.entityLabel);
  if (!target || !canOpen(target.page)) return <span className="font-medium">{label}</span>;
  if (target.page === 'orders') {
    return (
      <button type="button" className="link" title="Open record" onClick={() => onOpenOrder(target.orderId)}>
        {label}
      </button>
    );
  }
  return (
    <Link className="link" to={target.to} title="Open record">
      {label}
    </Link>
  );
}
