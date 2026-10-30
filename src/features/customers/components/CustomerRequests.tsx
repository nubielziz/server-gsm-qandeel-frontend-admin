// CustomerRequests: the data requests one customer made, one line each (number, kind, and done or still due). Ports the
// "Requests" row of the Consents tab in pageCustomer (48-p-customers.js). Reads `GET /admin/data-requests` filtered by the
// customer, so the caller shows it only to staff with `customers:privacy`.
import { ago } from '@/lib/format';
import { useDataRequests } from '../hooks/useDataRequests';
import { dueOf, dueText, requestKindLabel, requestNumber, requestStatusBadge } from '../lib/requests';
import type { DataRequest } from '../types';

// "Done 3d ago", "Open, due in 12d" (in the warning colour while it is still to do), "Rejected".
function RequestState({ request, now }: { request: DataRequest; now: number }) {
  if (request.status === 'completed') return <>Done {ago(request.completedAt, now)}</>;
  if (request.status === 'rejected') return <>Rejected</>;
  const due = dueOf(request.dueAt, now);
  return (
    <span className="font-medium text-warn-fg">
      {requestStatusBadge(request.status).label}
      {due && `, due ${dueText(due)}`}
    </span>
  );
}

export function CustomerRequests({ customerId, now }: { customerId: number; now: number }) {
  const { requests, query } = useDataRequests({
    filters: { customerId },
    page: 1,
    pageSize: 20,
    sort: { field: 'requestedAt', order: 'desc' },
  });
  if (query.isLoading) return <span className="text-ink3">Loading…</span>;
  if (query.isError) return <span className="text-crit-fg">Could not load the requests.</span>;
  if (requests.length === 0) return <span className="text-ink3">None</span>;
  return (
    <>
      {requests.map((request) => (
        <span key={request.id} className="block">
          {requestNumber(request.id)} · {requestKindLabel(request.kind)} ·{' '}
          <RequestState request={request} now={now} />
        </span>
      ))}
    </>
  );
}
