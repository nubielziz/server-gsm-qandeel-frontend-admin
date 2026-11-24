// The columns of the table of the Data requests view: Request | Account | Type | Received | Due | Status | Actions. The deadline is a legal one,
// so a due date is in the critical colour when it is under three days away or past. A request still to do has its buttons; a closed one has
// none. An erasure is closed by anonymizing the account (the server refuses to mark it done by hand), so its row offers Anonymize… in place of
// Done. Every word and date is the server's; the console only formats.
import { Link } from 'react-router';
import { Button, ButtonLink, StatusSquare, type DataTableColumn } from '@/components/ui';
import { accountLabel, ago, fmtDay } from '@/lib/format';
import { accountPath } from '../../lib/paths';
import type { DataRequest, DataRequestStatus } from '../../types';
import {
  dueOf,
  dueText,
  isPending,
  requestKindLabel,
  requestNumber,
  requestStatusLook,
} from './requestWords';

/** What the columns need from the view. */
export type RequestColumnsArgs = {
  /** From `useNow`, so the ages move together and a test can fix them. */
  now: number;
  /** The request whose change is running: its buttons are off, so it cannot be sent twice. */
  busyId?: number;
  onMove: (request: DataRequest, status: Exclude<DataRequestStatus, 'open'>) => void;
  onReject: (request: DataRequest) => void;
};

const DASH = <span className="text-ink3">–</span>;

// The deadline: critical when it is under three days away or past, plain otherwise; a closed request shows its day, muted.
function dueCell(request: DataRequest, now: number) {
  const due = isPending(request) ? dueOf(request.dueAt, now) : null;
  if (!due) {
    const day = fmtDay(request.dueAt);
    return day ? <span className="text-ink3">{day}</span> : DASH;
  }
  return (
    <span className={due.late || due.soon ? 'font-medium text-crit-fg' : undefined}>{dueText(due)}</span>
  );
}

/** The columns, in the order the table draws them. */
export function requestColumns({
  now,
  busyId,
  onMove,
  onReject,
}: RequestColumnsArgs): DataTableColumn<DataRequest>[] {
  return [
    {
      key: 'id',
      label: 'Request',
      render: (request) => <span className="mono font-medium">{requestNumber(request.id)}</span>,
    },
    {
      key: 'account',
      label: 'Account',
      render: (request) => (
        <Link className="link" to={accountPath(request.accountId)}>
          {accountLabel({ id: request.accountId, name: request.accountName })}
        </Link>
      ),
    },
    { key: 'kind', label: 'Type', render: (request) => requestKindLabel(request.kind) },
    {
      key: 'received',
      label: 'Received',
      hide: 'sm',
      sortField: 'requestedAt',
      render: (request) => (request.requestedAt ? ago(request.requestedAt, now) : DASH),
    },
    { key: 'due', label: 'Due', sortField: 'dueAt', render: (request) => dueCell(request, now) },
    {
      key: 'status',
      label: 'Status',
      sortField: 'status',
      render: (request) => {
        const look = requestStatusLook(request.status);
        return (
          <>
            <span className="inline-flex items-center gap-1.5">
              <StatusSquare tone={look.tone} label={look.word} />
              <span>{look.word}</span>
            </span>
            {request.status === 'completed' && request.completedAt && (
              <span className="cell-sub">{ago(request.completedAt, now)}</span>
            )}
          </>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end',
      render: (request) =>
        isPending(request) && (
          <span className="flex flex-wrap justify-end gap-1.5">
            {request.status === 'open' && (
              <Button
                size="sm"
                disabled={busyId === request.id}
                onClick={() => onMove(request, 'in_progress')}
              >
                Mark in progress
              </Button>
            )}
            {request.kind === 'erasure' ? (
              <ButtonLink
                size="sm"
                to={accountPath(request.accountId, 'privacy')}
                title="An erasure request is closed by anonymizing the account"
              >
                Anonymize…
              </ButtonLink>
            ) : (
              <Button size="sm" disabled={busyId === request.id} onClick={() => onMove(request, 'completed')}>
                Done
              </Button>
            )}
            <Button size="sm" disabled={busyId === request.id} onClick={() => onReject(request)}>
              Reject…
            </Button>
          </span>
        ),
    },
  ];
}
