// SessionsTab: the "Sessions" tab, which the demo lacks and the map adds (`GET /admin/sessions`, `DELETE
// /admin/sessions/:id`): who is signed in (staff and accounts), from where, on what device, when last seen and when it ends, with
// End session. A "Who" filter narrows the list to staff or to accounts; an account's session is ended with `clients:security`.
import { useState } from 'react';
import { Link } from 'react-router';
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
import { accountPath } from '@/features/accounts';
import { ago, useNow } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { SESSIONS_PAGE_SIZE, useSessions } from '../hooks/useSessions';
import { ageText } from '../lib/ipRules';
import { endPermissionOf, SESSION_WHO_ITEMS, SUBJECT_LABEL, type SessionWho } from '../lib/sessions';
import { describeUserAgent } from '../lib/userAgent';
import type { Session } from '../types';
import { EndSessionDialog } from './EndSessionDialog';

/** Lists the open sessions of staff and accounts a page at a time, with a "Who" filter and an End session button. */
export function SessionsTab() {
  const grants = useAccessGrants();
  const now = useNow();
  const [page, setPage] = useState(1);
  const [who, setWho] = useState<SessionWho>('all');
  const [ending, setEnding] = useState<Session | null>(null);
  const query = useSessions({ page, who });
  const lock = grants.needs('sessions:revoke');
  const sessions = query.data?.data ?? [];

  // An account's session needs one more permission than a staff session; the button says which one is missing.
  const lockOf = (session: Session) => {
    if (lock.disabled) return lock;
    const extra = endPermissionOf(session);
    return extra ? grants.needs(extra) : lock;
  };

  const columns: DataTableColumn<Session>[] = [
    {
      key: 'who',
      label: 'Who',
      render: (session) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={session.subject.name} />
          <div className="min-w-0">
            {session.subjectType === 'account' && grants.can('clients:read') ? (
              <Link className="link font-medium" to={accountPath(session.subject.id)}>
                {session.subject.name}
              </Link>
            ) : (
              <span className="font-medium">{session.subject.name}</span>
            )}
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
      render: (session) => <span className="text-ink2">{SUBJECT_LABEL[session.subjectType]}</span>,
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
      render: (session) => {
        const rowLock = lockOf(session);
        return (
          <Button
            size="sm"
            disabled={rowLock.disabled}
            title={rowLock.title}
            onClick={() => setEnding(session)}
          >
            End session
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Panel
        title="Sessions"
        sub="Every staff member and account signed in right now. Ending a session signs that person out of that device."
      >
        <div className="border-b border-line p-3">
          <SegmentedControl
            items={SESSION_WHO_ITEMS}
            value={who}
            onChange={(next) => {
              setWho(next);
              setPage(1);
            }}
            label="Who is signed in"
          />
        </div>
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
