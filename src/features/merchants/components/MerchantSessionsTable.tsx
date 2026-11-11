// MerchantSessionsTable: the open sessions of one merchant on the Security tab (address, device, last seen, started, ends) with an
// "End" button per row (`sessions:revoke`). The sessions come from the access feature's `GET /admin/sessions`.
import { Button, DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { ageText, describeUserAgent, type Session } from '@/features/access';
import { ago } from '@/lib/format';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { useEndMerchantSession } from '../hooks/useMerchantSessions';

export interface MerchantSessionsTableProps {
  rows: readonly Session[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  now: number;
  grants: MerchantGrants;
}

/** Draws the merchant's open sessions; ending one acts at once and shows the server's refusal in a toast. */
export function MerchantSessionsTable({
  rows,
  state,
  error,
  onRetry,
  now,
  grants,
}: MerchantSessionsTableProps) {
  const end = useEndMerchantSession();
  const lock = grants.needs('sessions:revoke');
  const columns: DataTableColumn<Session>[] = [
    { key: 'ip', label: 'Address', render: (session) => <span className="mono">{session.ip}</span> },
    {
      key: 'device',
      label: 'Device',
      render: (session) => (
        <span className="text-ink2" title={session.userAgent}>
          {describeUserAgent(session.userAgent)}
        </span>
      ),
    },
    {
      key: 'seen',
      label: 'Last seen',
      render: (session) => <span className="text-ink2">{ago(session.lastSeenAt, now) || 'Unknown'}</span>,
    },
    {
      key: 'started',
      label: 'Started',
      hide: 'sm',
      render: (session) => <span className="text-ink2">{ago(session.createdAt, now)}</span>,
    },
    {
      key: 'ends',
      label: 'Ends',
      hide: 'md',
      render: (session) =>
        session.expiresAt ? (
          <span className="text-ink2">in {ageText(Date.parse(session.expiresAt) - now)}</span>
        ) : (
          <span className="text-ink3">Never</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-20',
      render: (session) => (
        <Button
          size="sm"
          aria-label={`End session from ${session.ip}`}
          disabled={lock.disabled}
          title={lock.title}
          loading={end.isPending && end.variables?.id === session.id}
          onClick={() => end.mutate(session)}
        >
          End
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      caption="Open sessions"
      columns={columns}
      rows={rows}
      rowKey={(session) => session.id}
      state={state}
      error={error}
      errorTitle="Could not load the sessions"
      onRetry={onRetry}
      empty={
        <EmptyState icon="users" title="No open sessions">
          The merchant is not signed in anywhere right now.
        </EmptyState>
      }
    />
  );
}
