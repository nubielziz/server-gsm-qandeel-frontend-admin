// AuditDetails: the opened part of an audit entry: the before / after table and the line with the entry number, the
// time, the address it came from and the person's role. Ports the `detail` block of pageAudit in 47-p-audit.js. When the
// list row came without its before and after, it reads the single entry (`GET /admin/audit-logs/:id`).
import { Button, errorText, Skeleton } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useAuditLog } from '../hooks/useAuditLogs';
import { diffOf } from '../lib/diff';
import { auditCode } from '../lib/verb';
import type { AuditLog } from '../types';
import { DiffTable } from './DiffTable';

export interface AuditDetailsProps {
  id: string;
  row: AuditLog;
  /** The actor's role name, when known. */
  role: string | undefined;
}

export function AuditDetails({ id, row, role }: AuditDetailsProps) {
  const code = auditCode(row.id);
  // A row that carries neither snapshot was trimmed by the server; one that carries `null` for both is a plain action.
  const trimmed = row.before === undefined && row.after === undefined;
  const { entry, query } = useAuditLog(row.id, trimmed);
  const shown = trimmed ? entry : row;

  return (
    <div id={id} className="mb-1 ms-[68px] rounded-md border border-line bg-surface p-3 sm:ms-[148px]">
      {shown ? (
        <DiffTable lines={diffOf(shown.before, shown.after)} code={code} />
      ) : query.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-crit-fg">
          <span>{errorText(query.error)}</span>
          <Button size="sm" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div role="status" aria-label="Loading details" className="space-y-2">
          <Skeleton width="40%" height={10} />
          <Skeleton width="70%" height={10} />
        </div>
      )}
      <p className="mt-2 text-xs text-ink3">
        <span className="mono">{code}</span> · {fmtDate(row.createdAt)}
        {row.ip ? ` · from ${row.ip}` : ' · automatic'}
        {role ? ` · ${role}` : ''}
      </p>
    </div>
  );
}
