// RiskRows: the risk side of an account: the highest score on any of its orders and the signals seen on its orders, each with a link to the
// order. There is no risk level and no Flagged list: the score and the signals are the evidence, and what to do about them is a decision.
import { Link } from 'react-router';
import { FormRow, Icon, ReadValue, ScoreMeter } from '@/components/ui';
import { orderLabel, orderPath } from '@/features/orders';
import type { AccountRisk } from '../../types';

/** Most signals the part lists; a line says how many more there are. */
export const SIGNAL_LIMIT = 8;

/** The two rows of the Risk section. */
export function RiskRows({ risk }: { risk: AccountRisk }) {
  const shown = risk.signals.slice(0, SIGNAL_LIMIT);
  return (
    <>
      <FormRow label="Highest score">
        <ReadValue>
          {risk.highestScore === null ? (
            <span className="text-ink3">–</span>
          ) : (
            <ScoreMeter score={risk.highestScore} />
          )}
        </ReadValue>
      </FormRow>
      <FormRow label="Signals seen on orders">
        {shown.length > 0 ? (
          <>
            <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
              {shown.map((signal, index) => (
                <li key={`${signal.orderId}-${index}`} className="flex items-start gap-2">
                  <Icon name="alert" className="ic-sm mt-0.5 text-warn-fg" />
                  <span className="min-w-0 flex-1">
                    {signal.text} — Order{' '}
                    <Link className="link mono" to={orderPath(signal.orderId)}>
                      {orderLabel({ id: signal.orderId, channel: 'b2c' })}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
            {risk.signals.length > shown.length && (
              <p className="mt-2 text-xs text-ink3">and {risk.signals.length - shown.length} more.</p>
            )}
          </>
        ) : (
          <ReadValue muted>No risk signals on any order.</ReadValue>
        )}
      </FormRow>
    </>
  );
}
