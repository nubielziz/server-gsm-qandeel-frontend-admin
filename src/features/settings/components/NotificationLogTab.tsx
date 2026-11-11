// NotificationLogTab: the "Notification log" tab, one the demo lacks: every message the system sent or tried to send, newest first,
// with the recipient as the server prints it (masked). Status and channel filters, a pager, and a drawer for a row. All of it lives in the address.
// A message of a notification campaign links to the campaign, and `?campaignId=7` shows only that campaign's messages (a chip clears it).
import { Link } from 'react-router';
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  Panel,
  SelectField,
  TableToolbar,
  usePageClamp,
  type DataTableColumn,
} from '@/components/ui';
import { fmtDate, num } from '@/lib/format';
import { useListView } from '../hooks/useListView';
import { LOG_PAGE_SIZE } from '../hooks/keys';
import { useNotificationList } from '../hooks/useLogs';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { NOTIFICATION_STATUS, NOTIFICATION_STATUS_OPTIONS } from '../lib/logs';
import { CHANNEL_FILTER_OPTIONS, CHANNEL_LABEL, eventLabel } from '../lib/templates';
import type { NotificationLogEntry } from '../types';
import { NotificationDrawer } from './NotificationDrawer';
import { StatusBadge } from './StatusBadge';

const columns: DataTableColumn<NotificationLogEntry>[] = [
  {
    key: 'event',
    label: 'Event',
    render: (row) => (
      <>
        <p className="font-medium">{eventLabel(row.event)}</p>
        <p className="mono text-2xs text-ink3">{row.event}</p>
      </>
    ),
  },
  { key: 'channel', label: 'Channel', hide: 'sm', render: (row) => CHANNEL_LABEL[row.channel] },
  {
    key: 'recipient',
    label: 'Sent to',
    render: (row) => <span className="mono text-ink2">{row.recipient}</span>,
  },
  {
    key: 'campaign',
    label: 'Campaign',
    hide: 'lg',
    render: (row) =>
      row.campaignId ? (
        // The Notifications page (a literal path: that feature imports this one, so this one does not import it back).
        <Link to={`/notifications/${row.campaignId}`} className="text-accent-ink hover:underline">
          Campaign #{row.campaignId}
        </Link>
      ) : (
        <span className="text-ink3">–</span>
      ),
  },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge look={NOTIFICATION_STATUS[row.status]} /> },
  {
    key: 'time',
    label: 'Time',
    hide: 'md',
    render: (row) => <span className="text-ink2">{fmtDate(row.sentAt ?? row.createdAt)}</span>,
  },
];

/** The filters, the table and the open drawer. */
export function NotificationLogTab() {
  const grants = useSettingsGrants();
  const view = useListView(['status', 'channel', 'campaignId'], 'notification');
  // A campaign filter from a bad address (`campaignId=abc`) is ignored: the server takes an id only.
  const campaignId = /^\d+$/.test(view.filters.campaignId) ? view.filters.campaignId : '';
  const list = useNotificationList({
    filters: { ...view.filters, campaignId },
    page: view.page,
    enabled: grants.ready && grants.can('notifications:read'),
  });
  usePageClamp({
    page: view.page,
    pageSize: LOG_PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });
  const filtered = Boolean(view.filters.status || view.filters.channel || campaignId);

  return (
    <>
      <Panel
        title="Notification log"
        sub="Every message the system sent or tried to send. Addresses are masked by the server."
        flush
      >
        <TableToolbar
          count={
            list.total === undefined
              ? undefined
              : `${num(list.total)} ${list.total === 1 ? 'message' : 'messages'}`
          }
        >
          {campaignId && (
            <Button
              size="sm"
              aria-label={`Clear the filter: campaign ${campaignId}`}
              onClick={() => view.setFilters({ campaignId: '' })}
            >
              Campaign #{campaignId}
              <Icon name="x" className="ic-sm" />
            </Button>
          )}
          <SelectField
            aria-label="Filter by status"
            value={view.filters.status}
            options={NOTIFICATION_STATUS_OPTIONS}
            onChange={(event) => view.setFilters({ status: event.target.value })}
          />
          <SelectField
            aria-label="Filter by channel"
            value={view.filters.channel}
            options={CHANNEL_FILTER_OPTIONS}
            onChange={(event) => view.setFilters({ channel: event.target.value })}
          />
        </TableToolbar>
        <div className="border-t border-line">
          <DataTable
            caption="Notification log"
            columns={columns}
            rows={list.rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => view.open(row.id)}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            errorTitle="Could not load the notification log"
            onRetry={() => void list.query.refetch()}
            pagination={{ page: view.page, pageSize: LOG_PAGE_SIZE, total: list.total ?? list.rows.length }}
            onPageChange={view.setPage}
            empty={
              <EmptyState icon="bell" title={filtered ? 'No messages match' : 'No messages yet'}>
                {filtered
                  ? 'Try another status or channel.'
                  : 'Messages the system sends will be listed here.'}
              </EmptyState>
            }
          />
        </div>
      </Panel>
      {view.openId !== null && (
        <NotificationDrawer
          key={view.openId}
          id={view.openId}
          row={list.rows.find((row) => row.id === view.openId)}
          onClose={view.close}
        />
      )}
    </>
  );
}
