// DataRequestsTab: the Data requests tab of the Customers page: the export and erasure requests customers made, with their legal
// deadline, a status menu (open and in progress by default, so the table matches the tab's count) and the buttons that move a
// request along. New in the console (the demo only showed a customer's requests as text); it needs `customers:privacy`.
import { useState } from 'react';
import { EmptyState, SelectField, TableToolbar, usePageClamp, type SortState } from '@/components/ui';
import { num } from '@/lib/format';
import { useDataRequests } from '../hooks/useDataRequests';
import { useUpdateDataRequest } from '../hooks/usePrivacyMutations';
import { PAGE_SIZE, REQUEST_STATUS_OPTIONS, requestFilters, type RequestStatusFilter } from '../lib/filters';
import type { DataRequest } from '../types';
import { DataRequestTable } from './DataRequestTable';
import { RejectRequestDialog } from './RejectRequestDialog';

export interface DataRequestsTabProps {
  now: number;
  page: number;
  sort: SortState;
  /** The status menu's choice; the empty value is the default, open and in progress. */
  status: RequestStatusFilter;
  onPageChange: (page: number) => void;
  onSortChange: (sort: SortState) => void;
  onStatusChange: (status: RequestStatusFilter) => void;
}

export function DataRequestsTab({
  now,
  page,
  sort,
  status,
  onPageChange,
  onSortChange,
  onStatusChange,
}: DataRequestsTabProps) {
  const list = useDataRequests({ filters: requestFilters(status), page, pageSize: PAGE_SIZE, sort });
  const update = useUpdateDataRequest();
  const [rejecting, setRejecting] = useState<DataRequest | null>(null);
  usePageClamp({
    page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: onPageChange,
  });

  return (
    <>
      <TableToolbar
        count={
          list.total === undefined
            ? undefined
            : `${num(list.total)} ${list.total === 1 ? 'request' : 'requests'}`
        }
      >
        <SelectField
          aria-label="Filter by status"
          value={status}
          options={REQUEST_STATUS_OPTIONS}
          onChange={(event) => onStatusChange(event.target.value as RequestStatusFilter)}
        />
      </TableToolbar>
      <div className="border-t border-line">
        <DataRequestTable
          rows={list.requests}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          now={now}
          sort={sort}
          onSortChange={onSortChange}
          pagination={{ page, pageSize: PAGE_SIZE, total: list.total ?? list.requests.length }}
          onPageChange={onPageChange}
          busyId={update.isPending ? update.variables.request.id : undefined}
          onMove={(request, next) => update.mutate({ request, body: { status: next } })}
          onReject={setRejecting}
          empty={
            <EmptyState icon="shield" title="No data requests">
              {status === 'all'
                ? 'Customers ask for a copy of their data or for it to be erased through the storefront. Each request has a legal deadline and appears here.'
                : 'Nothing has this status. Choose All statuses to see every request, closed ones too.'}
            </EmptyState>
          }
        />
      </div>
      {rejecting && <RejectRequestDialog request={rejecting} onClose={() => setRejecting(null)} />}
    </>
  );
}
