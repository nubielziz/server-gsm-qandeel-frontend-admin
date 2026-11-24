// DataRequestsView: the "Data requests" view of the Accounts page: the export and erasure requests people made, one queue across all
// accounts, because each has a legal deadline. A Quick Search box with the status menu (open and in progress by default, so the table
// matches the number on the link), one refresh tool, a dense table, and the pinned footer with the page and the page size. The status, the
// sort, the page and the size live in the address. Every request is moved along by its row buttons; Reject asks for a note first.
import { useCallback, useState } from 'react';
import { DataTable, FooterPager, LegendBox, RefreshTool, SelectField, usePageClamp } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useDataRequests, useUpdateDataRequest } from '../../hooks/useDataRequests';
import type { DataRequest } from '../../types';
import type { AccountsViewProps } from '../types';
import { RejectRequestDialog } from './RejectRequestDialog';
import { requestColumns } from './requestColumns';
import { REQUEST_STATUS_OPTIONS, requestFilters, type RequestMenuValue } from './requestsAddress';
import { RequestsEmpty } from './RequestsEmpty';
import { useRequestsAddress } from './useRequestsAddress';

/**
 * The view. It is offered only to a role that holds `clients:read` and `customers:privacy` (the view registry), and the server checks
 * every call. A refusal of a row button shows as a toast; a refusal of Reject stays in its dialog.
 *
 * @param props.grants what the staff member may do (the view reads once they are known).
 * @see GET /admin/data-requests
 * @see PATCH /admin/data-requests/:id
 */
export function DataRequestsView({ grants }: AccountsViewProps) {
  const { address, change } = useRequestsAddress();
  const list = useDataRequests({
    filters: requestFilters(address.request),
    page: address.page,
    pageSize: address.size,
    sort: { field: address.sort, order: address.dir },
    enabled: grants.ready,
  });
  const update = useUpdateDataRequest();
  const [rejecting, setRejecting] = useState<DataRequest | null>(null);
  const now = useNow();

  // Stable until the address moves: a new function would run the clamp again.
  const setPage = useCallback((page: number) => change({ page }), [change]);
  usePageClamp({
    page: address.page,
    pageSize: address.size,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  const columns = requestColumns({
    now,
    busyId: update.isPending ? update.variables.request.id : undefined,
    onMove: (request, status) => update.mutate({ request, body: { status } }),
    onReject: setRejecting,
  });

  return (
    <div className="view-frame">
      <div>
        <LegendBox legend="Quick Search">
          <SelectField
            aria-label="Status"
            options={REQUEST_STATUS_OPTIONS}
            value={address.request}
            selectWrapClassName="w-full sm:w-56"
            onChange={(event) => change({ request: event.target.value as RequestMenuValue })}
          />
        </LegendBox>
        <RefreshTool onRefresh={() => void list.query.refetch()} busy={list.query.isFetching} />
        <DataTable
          skin="list"
          footer={false}
          caption="Data requests"
          columns={columns}
          rows={list.requests}
          rowKey={(request) => request.id}
          sort={{ field: address.sort, order: address.dir }}
          onSortChange={(next) => change({ sort: next.field as typeof address.sort, dir: next.order })}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          errorTitle="Could not load the data requests"
          onRetry={() => void list.query.refetch()}
          empty={<RequestsEmpty request={address.request} />}
        />
      </div>
      <FooterPager
        page={address.page}
        pageSize={address.size}
        total={list.total ?? 0}
        onPage={(page) => change({ page })}
        onPageSize={(size) => change({ size })}
      />
      {rejecting && <RejectRequestDialog request={rejecting} onClose={() => setRejecting(null)} />}
    </div>
  );
}
