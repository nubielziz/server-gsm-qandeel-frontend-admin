// RequestsEmpty: what the Data requests view says when the table has no rows, in the words of the status menu's choice.
import { EmptyState } from '@/components/ui';
import type { RequestMenuValue } from './requestsAddress';

// The title of each choice: what is not there.
const TITLE: Record<RequestMenuValue, string> = {
  '': 'No open or in progress requests',
  open: 'No open requests',
  in_progress: 'No requests in progress',
  completed: 'No done requests',
  rejected: 'No rejected requests',
  any: 'No requests yet',
};

/** The empty state of the table. */
export function RequestsEmpty({ request }: { request: RequestMenuValue }) {
  return (
    <EmptyState icon="shield" title={TITLE[request]}>
      {request === 'any'
        ? 'People ask for a copy of their data, or for it to be erased, through the shop. Each request has a legal deadline and appears here.'
        : 'Choose All statuses to see every request, closed ones too.'}
    </EmptyState>
  );
}
