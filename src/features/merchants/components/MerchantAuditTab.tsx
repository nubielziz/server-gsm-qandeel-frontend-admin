// MerchantAuditTab: the "Audit" tab of a merchant's page (feature 20): the entries about this merchant, newest first, 25 at a time
// with "Show more". Each row says when, who, what (`<action> <record name>`) and from which address, and a link opens the Audit
// log filtered to this merchant. Needs `audit:read` (the tab is left out without it).
import { useState } from 'react';
import { Link } from 'react-router';
import { Button, EmptyState, QueryState, SkeletonTable } from '@/components/ui';
import type { AuditLog } from '@/features/audit';
import { fmtDate } from '@/lib/format';
import { useMerchantAudit } from '../hooks/useMerchantAudit';
import { AUDIT_TAB_PAGE_SIZE } from '../lib/billing';
import type { Client } from '../types';

// "Lina S." / "System" / "Staff #3": the name the server saved, else a fallback.
function whoOf(row: AuditLog): string {
  if (row.actorName?.trim()) return row.actorName.trim();
  if (row.actorType === 'system') return 'System';
  return row.actorId ? `Staff #${row.actorId}` : 'Someone';
}

function Row({ row }: { row: AuditLog }) {
  return (
    <li className="flex items-start gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-b-0">
      <time dateTime={row.createdAt} className="mono w-[124px] flex-none pt-0.5 tabular-nums text-ink3">
        {fmtDate(row.createdAt)}
      </time>
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-medium">{whoOf(row)}</span> {row.action}
          {row.entityLabel ? ` ${row.entityLabel}` : ''}
        </p>
      </div>
      {row.ip && <span className="mono hidden flex-none text-xs text-ink3 sm:inline">{row.ip}</span>}
    </li>
  );
}

/** Lists the audit entries about the merchant with a link to the full audit log filtered to them. */
export function MerchantAuditTab({ client }: { client: Pick<Client, 'id' | 'name'> }) {
  const [limit, setLimit] = useState(AUDIT_TAB_PAGE_SIZE);
  const audit = useMerchantAudit(client.id, limit);
  const rows = audit.data?.data ?? [];
  const total = audit.data?.total ?? rows.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-3 text-sm">
        <span className="text-ink2">Every change staff made to {client.name}, newest first.</span>
        <Link className="link" to={`/audit?type=merchant&record=${client.id}`}>
          Open in the audit log
        </Link>
      </div>
      <QueryState
        isLoading={audit.isLoading}
        isError={audit.isError && rows.length === 0}
        error={audit.error}
        onRetry={() => void audit.refetch()}
        errorTitle="Could not load the audit entries"
        skeleton={<SkeletonTable cols={3} rows={5} />}
        isEmpty={rows.length === 0}
        empty={
          <EmptyState icon="history" title="Nothing recorded yet">
            Changes to this merchant’s details, security, keys and status are written here.
          </EmptyState>
        }
      >
        <ul aria-label="Audit entries">
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
        {rows.length < total && (
          <div className="border-t border-line p-3 text-center">
            <Button
              loading={audit.isFetching}
              onClick={() => setLimit((current) => current + AUDIT_TAB_PAGE_SIZE)}
            >
              Show more
            </Button>
          </div>
        )}
      </QueryState>
    </div>
  );
}
