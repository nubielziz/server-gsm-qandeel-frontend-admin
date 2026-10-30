// RerouteResult: what a finished reroute did: how many orders were moved and sent, and, for each order that was refused, its
// number and the server's own words (including "moved, but not sent" when the second call failed). Same idea as the orders
// feature's bulk summary dialog.
import { Icon } from '@/components/ui';
import { ordersText, type RerouteOutcome } from '../lib/reroute';

export interface RerouteResultProps {
  outcome: RerouteOutcome;
  total: number;
  targetName: string;
  /** The order's number as the page shows it (`ORD-48100`), by id. */
  labelOf: (id: number) => string;
}

/** The summary of a finished run: the count, and each refused order with the server's words. */
export function RerouteResult({ outcome, total, targetName, labelOf }: RerouteResultProps) {
  return (
    <div className="space-y-3" role="status">
      <p className="flex items-start gap-2 text-sm">
        <Icon
          name={outcome.failed.length === 0 ? 'checkCircle' : 'alert'}
          className={outcome.failed.length === 0 ? 'mt-0.5 text-good-fg' : 'mt-0.5 text-warn-fg'}
        />
        <span>
          {outcome.done} of {ordersText(total)} rerouted to {targetName}.
          {outcome.failed.length > 0 &&
            ` ${outcome.failed.length} ${outcome.failed.length === 1 ? 'was' : 'were'} refused.`}
        </span>
      </p>
      {outcome.failed.length > 0 && (
        <ul
          className="m-0 max-h-56 list-none divide-y divide-line overflow-auto rounded-md border border-line p-0 text-sm [&>li]:px-3 [&>li]:py-2"
          aria-label="Orders that were not rerouted"
        >
          {outcome.failed.map((failure) => (
            <li key={failure.id}>
              <span className="mono font-medium">{labelOf(failure.id)}</span>
              <p className="text-xs text-ink2">{failure.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
