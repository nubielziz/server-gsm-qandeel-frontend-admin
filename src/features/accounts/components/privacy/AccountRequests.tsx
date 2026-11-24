// AccountRequests: the data requests one account made, one line each ("DSR-12 · Export · done 2d ago", "DSR-12 · Export · due in 3d"). The
// deadline is a legal one, so a line is in the critical colour when it is under three days away or past. Reads the data requests filtered by
// the account, so the caller shows it only to staff with `customers:privacy`.
import { Button, Skeleton } from '@/components/ui';
import { useDataRequests } from '../../hooks/useDataRequests';
import { requestKindLabel, requestNumber, requestState } from '../requests/requestWords';

/** Most requests the part lists; an account has a handful at most. */
const LIMIT = 20;

/** The account's requests, newest first; "No requests" when it made none. */
export function AccountRequests({ accountId, now }: { accountId: number; now: number }) {
  const { requests, query } = useDataRequests({
    filters: { accountId },
    page: 1,
    pageSize: LIMIT,
    sort: { field: 'requestedAt', order: 'desc' },
  });
  if (query.isLoading) return <Skeleton width="50%" className="my-2" />;
  if (query.isError) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm text-crit-fg" role="alert">
        Could not load the requests.
        <Button size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </span>
    );
  }
  if (requests.length === 0) return <span className="text-sm text-ink3 md:min-h-8">No requests</span>;
  return (
    <ul className="m-0 list-none space-y-1 p-0 text-sm">
      {requests.map((request) => {
        const state = requestState(request, now);
        return (
          <li key={request.id}>
            {requestNumber(request.id)} · {requestKindLabel(request.kind)} ·{' '}
            {state.urgent ? <span className="font-medium text-crit-fg">{state.text}</span> : state.text}
          </li>
        );
      })}
    </ul>
  );
}
