// SessionsTab: the "Sessions" tab, which the demo lacks and the map adds (`GET /admin/sessions`, `DELETE
// /admin/sessions/:id`): which staff members are signed in, from where, on what device, when last seen and when it ends, with End
// session.
import { useState } from 'react';
import { Avatar, Button, DataTable, EmptyState, Panel, TypeTag, type DataTableColumn } from '@/components/ui';
import { ago, useNow } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { SESSIONS_PAGE_SIZE, useSessions } from '../hooks/useSessions';
import { ageText } from '../lib/ipRules';
import { describeUserAgent } from '../lib/userAgent';
import type { Session } from '../types';
import { EndSessionDialog } from './EndSessionDialog';

/** Lists the open sessions of staff a page at a time, with an End session button. */
export function SessionsTab() {
  const grants = useAccessGrants();
  const now = useNow();
  const [page, setPage] = useState(1);
  const [ending, setEnding] = useState<Session | null>(null);
  const query = useSessions({ page });
  const lock = grants.needs('sessions:revoke');
  const sessions = query.data?.data ?? [];

  const columns: DataTableColumn<Session>[] = [
    {
      key: 'who',
      label: 'Who',
      render: (session) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={session.subject.name} />
          <div className="min-w-0">
            <span className="font-medium">{session.subject.name}</span>
            {session.current && <TypeTag className="ms-1">This session</TypeTag>}
            {session.subject.email && <p className="truncate text-2xs text-ink3">{session.subject.email}</p>}
          </div>
        </div>
      ),
    },
    { key: 'ip', label: 'Address', render: (session) => <span className="mono">{session.ip}</span> },
    {
      key: 'device',
      label: 'Device',
      hide: 'md',
      render: (session) => (
        <span className="text-ink2" title={session.userAgent}>
          {describeUserAgent(session.userAgent)}
        </span>
      ),
    },
    {
      key: 'seen',
      label: 'Last seen',
      hide: 'sm',
      render: (session) => <span className="text-ink2">{ago(session.lastSeenAt, now) || 'Unknown'}</span>,
    },
    {
      key: 'expires',
      label: 'Expires',
      hide: 'lg',
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
      render: (session) => (
        <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={() => setEnding(session)}>
          End session
        </Button>
      ),
    },
  ];

  return (
    <>
      <Panel
        title="Sessions"
        sub="Every staff member signed in right now. Ending a session signs that person out of that device."
      >
        <DataTable
          caption="Open sessions"
          columns={columns}
          rows={sessions}
          rowKey={(session) => session.id}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          errorTitle="Could not load the sessions"
          onRetry={() => void query.refetch()}
          pagination={{ page, pageSize: SESSIONS_PAGE_SIZE, total: query.data?.total ?? sessions.length }}
          onPageChange={setPage}
          empty={
            <EmptyState icon="users" title="No open sessions">
              Nobody is signed in right now.
            </EmptyState>
          }
        />
      </Panel>
      {ending && <EndSessionDialog session={ending} onClose={() => setEnding(null)} />}
    </>
  );
}
