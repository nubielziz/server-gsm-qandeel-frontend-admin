// SessionsTab: the "Sessions" tab, which the demo lacks and the map adds (`GET /admin/sessions`, `DELETE
// /admin/sessions/:id`): who is signed in, from where, on what device, when last seen and when it ends, with End session.
import { useState } from 'react';
import {
  Avatar,
  Button,
  DataTable,
  EmptyState,
  Panel,
  SegmentedControl,
  TypeTag,
  type DataTableColumn,
} from '@/components/ui';
import { ago, useNow } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { SESSIONS_PAGE_SIZE, useSessions } from '../hooks/useSessions';
import { ageText } from '../lib/ipRules';
import { describeUserAgent } from '../lib/userAgent';
import type { Session, SessionSubjectType } from '../types';
import { EndSessionDialog } from './EndSessionDialog';

type Filter = 'all' | SessionSubjectType;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'staff', label: 'Staff' },
  { value: 'client', label: 'Merchants' },
] as const;

/**
 * Lists the open sessions a page at a time, with a filter for staff or merchants and an End session
 * button.
 */
export function SessionsTab() {
  const grants = useAccessGrants();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [ending, setEnding] = useState<Session | null>(null);
  const query = useSessions({ subjectType: filter === 'all' ? undefined : filter, page });
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
    {
      key: 'type',
      label: 'Type',
      hide: 'sm',
      render: (session) => <TypeTag>{session.subjectType === 'staff' ? 'Staff' : 'Merchant'}</TypeTag>,
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
        sub="Everyone signed in right now, staff and merchants. Ending a session signs that person out of that device."
        right={
          <SegmentedControl
            items={FILTERS}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setPage(1);
            }}
            label="Who is signed in"
          />
        }
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
              {filter === 'all'
                ? 'Nobody is signed in right now.'
                : 'Nobody in this group is signed in right now.'}
            </EmptyState>
          }
        />
      </Panel>
      {ending && <EndSessionDialog session={ending} onClose={() => setEnding(null)} />}
    </>
  );
}
