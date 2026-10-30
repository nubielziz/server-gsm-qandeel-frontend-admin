// WebhooksTab: the "Webhook deliveries" tab, one the demo lacks: each attempt to call a merchant's webhook, newest first, with the event,
// address, answer code and attempts. Search and status filter, a pager, and a drawer with the request, the response and Retry.
import {
  Badge,
  DataTable,
  EmptyState,
  Panel,
  SearchInput,
  SelectField,
  TableToolbar,
  usePageClamp,
  useDebouncedCommit,
  type DataTableColumn,
} from '@/components/ui';
import { fmtDate, num } from '@/lib/format';
import { useListView } from '../hooks/useListView';
import { LOG_PAGE_SIZE } from '../hooks/keys';
import { useDeliveryList } from '../hooks/useLogs';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { answerText, DELIVERY_STATUS, DELIVERY_STATUS_OPTIONS, hostOf } from '../lib/logs';
import { eventLabel } from '../lib/templates';
import type { WebhookDelivery } from '../types';
import { DeliveryDrawer } from './DeliveryDrawer';
import { StatusBadge } from './StatusBadge';

const columns: DataTableColumn<WebhookDelivery>[] = [
  {
    key: 'merchant',
    label: 'Merchant',
    render: (row) => (
      <span className="font-medium">{row.client?.name ?? <span className="text-ink3">Removed</span>}</span>
    ),
  },
  {
    key: 'event',
    label: 'Event',
    render: (row) => (
      <>
        <p>{eventLabel(row.event)}</p>
        <p className="mono text-2xs text-ink3">{row.event}</p>
      </>
    ),
  },
  {
    key: 'url',
    label: 'Address',
    hide: 'md',
    render: (row) => (
      <span className="mono block max-w-[220px] truncate text-ink2" title={row.endpoint?.url}>
        {row.endpoint ? hostOf(row.endpoint.url) : '–'}
      </span>
    ),
  },
  {
    key: 'code',
    label: 'Answer',
    num: true,
    render: (row) => (
      <Badge tone={row.responseCode >= 200 && row.responseCode < 300 ? 'good' : 'neutral'}>
        {answerText(row.responseCode)}
      </Badge>
    ),
  },
  { key: 'attempt', label: 'Attempts', num: true, hide: 'sm', render: (row) => row.attempt },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge look={DELIVERY_STATUS[row.status]} /> },
  {
    key: 'time',
    label: 'Time',
    hide: 'lg',
    render: (row) => <span className="text-ink2">{fmtDate(row.createdAt)}</span>,
  },
];

/** The filters, the table and the open drawer. */
export function WebhooksTab() {
  const grants = useSettingsGrants();
  const view = useListView(['status', 'q'], 'delivery');
  const search = useDebouncedCommit(view.filters.q, (q) => view.setFilters({ q }));
  const list = useDeliveryList({
    filters: view.filters,
    page: view.page,
    enabled: grants.ready && grants.can('webhooks:read'),
  });
  usePageClamp({
    page: view.page,
    pageSize: LOG_PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  const filtered = Boolean(view.filters.status || view.filters.q);

  return (
    <>
      <Panel
        title="Webhook deliveries"
        sub="Each attempt to tell a merchant about an order or a deposit. A failed delivery can be sent again."
        flush
      >
        <TableToolbar
          count={
            list.total === undefined
              ? undefined
              : `${num(list.total)} ${list.total === 1 ? 'delivery' : 'deliveries'}`
          }
        >
          <SearchInput
            value={search.text}
            onChange={search.setText}
            placeholder="Search merchant, event, address"
          />
          <SelectField
            aria-label="Filter by status"
            value={view.filters.status}
            options={DELIVERY_STATUS_OPTIONS}
            onChange={(event) => view.setFilters({ status: event.target.value })}
          />
        </TableToolbar>
        <div className="border-t border-line">
          <DataTable
            caption="Webhook deliveries"
            columns={columns}
            rows={list.rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => view.open(row.id)}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            errorTitle="Could not load the webhook deliveries"
            onRetry={() => void list.query.refetch()}
            pagination={{ page: view.page, pageSize: LOG_PAGE_SIZE, total: list.total ?? list.rows.length }}
            onPageChange={view.setPage}
            empty={
              <EmptyState icon="link" title={filtered ? 'No deliveries match' : 'No deliveries yet'}>
                {filtered
                  ? 'Try another search or status.'
                  : 'Webhook calls to merchants will be listed here.'}
              </EmptyState>
            }
          />
        </div>
      </Panel>
      {view.openId !== null && (
        <DeliveryDrawer
          key={view.openId}
          id={view.openId}
          row={list.rows.find((row) => row.id === view.openId)}
          onClose={view.close}
        />
      )}
    </>
  );
}
