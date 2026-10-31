// errorColumns: the columns of the top errors table of the API tab (and the lines of each card on a phone).
import { CopyButton, type DataTableColumn } from '@/components/ui';
import { ago, fmtDate, num } from '@/lib/format';
import { DeepLink } from '../../components';
import type { ErrorGroup } from '../../types';

export interface ErrorColumnOptions {
  /** The clock for "5m ago" (epoch ms), shared by the whole table so every row judges by the same moment. */
  now: number;
  /** Add the Sentry column. Only when `VITE_SENTRY_URL` is set: otherwise it would be a column of nothing. */
  sentry: boolean;
}

// "5m ago" to read at a glance, the exact time in the tooltip.
function seen(at: string, now: number) {
  return (
    <time className="whitespace-nowrap tabular-nums" dateTime={at} title={fmtDate(at)}>
      {ago(at, now)}
    </time>
  );
}

/**
 * The code comes first (it becomes the heading of a card on a phone). Code, endpoint and request ID are mono: they are
 * what someone copies into a log search or a ticket. The Sentry link has an empty label, so a card puts it at its foot.
 */
export function errorColumns({ now, sentry }: ErrorColumnOptions): DataTableColumn<ErrorGroup>[] {
  const columns: DataTableColumn<ErrorGroup>[] = [
    {
      key: 'code',
      label: 'Code',
      render: (group) => <span className="mono font-medium break-all">{group.code}</span>,
    },
    { key: 'status', label: 'Status', num: true, hide: 'lg', render: (group) => group.status },
    {
      key: 'endpoint',
      label: 'Endpoint',
      render: (group) => (
        <span className="font-mono text-xs break-words">
          <span className="text-ink3">{group.method}</span> {group.endpoint}
        </span>
      ),
    },
    { key: 'count', label: 'Count', num: true, render: (group) => num(group.count) },
    { key: 'first', label: 'First seen', hide: 'xl', render: (group) => seen(group.firstSeenAt, now) },
    { key: 'last', label: 'Last seen', render: (group) => seen(group.lastSeenAt, now) },
    {
      key: 'request',
      label: 'Request ID',
      render: (group) =>
        group.lastRequestId ? (
          <span className="inline-flex items-center gap-0.5">
            <span className="mono">{group.lastRequestId}</span>
            <CopyButton value={group.lastRequestId} label={`request ID ${group.lastRequestId}`} />
          </span>
        ) : (
          <span className="text-ink3">None</span>
        ),
    },
  ];
  if (sentry) {
    columns.push({
      key: 'sentry',
      label: '',
      render: (group) =>
        // A group the server has no issue for gets no link: the bare Sentry address would send support to the wrong place.
        group.sentryUrl ? (
          <DeepLink to="sentry" path={group.sentryUrl} variant="button">
            Sentry<span className="sr-only"> issue of {group.code}</span>
          </DeepLink>
        ) : null,
    });
  }
  return columns;
}
