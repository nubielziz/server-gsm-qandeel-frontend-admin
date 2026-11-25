// WaitingPanel: the "Waiting for you" panel of the Money Overview: one row per queue that has something in it (deposits to review, refunds to
// decide or retry, card disputes that need evidence), each with its count and a link to the view that works it.
import { ButtonLink, Count, Panel, Skeleton } from '@/components/ui';
import type { MoneyViewSpec } from '../../lib/moneyViews';
import type { MoneyModules } from '../../lib/modules';
import { waitingFor } from './waiting';

export interface WaitingPanelProps {
  /** The views the role may use: a queue is listed only when its view is one of them. */
  usable: readonly MoneyViewSpec[];
  /** The loaded views: their count hooks say what waits. */
  modules: MoneyModules;
}

/** The panel; nothing at all for a role that may work none of the queues. */
export function WaitingPanel({ usable, modules }: WaitingPanelProps) {
  const { useDepositsWaiting } = modules.finance;
  const { useMoneyBackWaiting } = modules.refunds;
  const deposits = useDepositsWaiting();
  const back = useMoneyBackWaiting();
  const waiting = waitingFor(usable, { deposits, refunds: back.refunds, disputes: back.disputes });
  if (waiting.state === 'none') return null;
  return (
    <Panel title="Waiting for you">
      {waiting.state === 'loading' && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-2">
          <span className="sr-only">Loading…</span>
          <Skeleton width="40%" />
          <Skeleton width="30%" />
        </div>
      )}
      {waiting.state === 'empty' && <p className="text-sm text-ink3">Nothing is waiting.</p>}
      {waiting.state === 'rows' && (
        <ul className="divide-y divide-line">
          {waiting.rows.map((row) => (
            <li
              key={row.view}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
            >
              <span className="flex items-center gap-2 text-sm">
                <Count>{row.count}</Count>
                {row.text}
              </span>
              <ButtonLink to={row.to} size="sm">
                {row.link}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
