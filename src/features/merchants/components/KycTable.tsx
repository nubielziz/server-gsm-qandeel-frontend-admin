// KycTable: the verification requests (merchant, submitted, documents, status, reviewed by). A table the demo lacks (MISMATCHES M47).
// The merchant's name is the button that opens the request's drawer, so the keyboard has a way in; it only draws what it is given.
import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn, type PaginationState } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import type { KycSubmission } from '../types';
import { KycStatusBadge } from './KycStatusBadge';

export interface KycTableProps {
  rows: readonly KycSubmission[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  now: number;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onOpen: (submission: KycSubmission) => void;
  empty?: ReactNode;
}

/** Draws the verification requests; the page owns the data and the page number. */
export function KycTable({
  rows,
  state,
  error,
  onRetry,
  now,
  pagination,
  onPageChange,
  onOpen,
  empty,
}: KycTableProps) {
  const columns: DataTableColumn<KycSubmission>[] = [
    {
      key: 'merchant',
      label: 'Merchant',
      render: (submission) => (
        <>
          <button type="button" className="link font-medium" onClick={() => onOpen(submission)}>
            {submission.client.name}
          </button>
          <p className="max-w-[320px] truncate text-2xs text-ink3">
            <span className="mono">{submission.client.country}</span> · {submission.client.email}
          </p>
        </>
      ),
    },
    {
      key: 'submitted',
      label: 'Submitted',
      render: (submission) => (
        <>
          {ago(submission.createdAt, now)}
          <p className="text-2xs text-ink3">{fmtDate(submission.createdAt)}</p>
        </>
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      num: true,
      hide: 'sm',
      render: (submission) => submission.fileIds.length,
    },
    { key: 'status', label: 'Status', render: (submission) => <KycStatusBadge status={submission.status} /> },
    {
      key: 'reviewed',
      label: 'Reviewed',
      hide: 'md',
      render: (submission) =>
        submission.reviewedAt ? (
          <>
            {submission.reviewedBy?.name ?? 'Staff'}
            <p className="text-2xs text-ink3">{ago(submission.reviewedAt, now)}</p>
          </>
        ) : (
          <span className="text-ink3">–</span>
        ),
    },
  ];

  return (
    <DataTable
      caption="Verification requests"
      columns={columns}
      rows={rows}
      rowKey={(submission) => submission.id}
      onRowClick={onOpen}
      pagination={pagination}
      onPageChange={onPageChange}
      state={state}
      error={error}
      errorTitle="Could not load the verification requests"
      onRetry={onRetry}
      empty={empty}
    />
  );
}
