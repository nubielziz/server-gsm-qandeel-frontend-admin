// RiskTab: the customer's risk level, status, internal notes and highest score on the left, and the signals seen on their orders
// (each linking to the order) on the right. Ports the Risk tab of pageCustomer in 48-p-customers.js.
import { Link } from 'react-router';
import { Icon, KeyValue, ScoreMeter } from '@/components/ui';
import { orderLabel, orderPath } from '@/features/orders';
import type { CustomerDetail } from '../types';
import { CustomerStatusBadge } from './CustomerStatusBadge';
import { RiskBadge } from './RiskBadge';

/** Most signals the tab lists (the demo's limit); a line says how many more there are. */
const SIGNAL_LIMIT = 8;

export function RiskTab({ customer }: { customer: CustomerDetail }) {
  const { highestScore, signals } = customer.risk;
  const shown = signals.slice(0, SIGNAL_LIMIT);
  return (
    <div className="grid gap-4 p-3.5 lg:grid-cols-2">
      <div>
        <KeyValue
          rows={[
            ['Risk level', <RiskBadge level={customer.riskLevel} />],
            ['Status', <CustomerStatusBadge status={customer.status} />],
            ['Notes', customer.internalNotes || <span className="text-ink3">None</span>],
            ['Highest score', highestScore === null ? '–' : <ScoreMeter score={highestScore} />],
          ]}
        />
      </div>
      <div>
        <h3 className="mb-2 text-xs font-medium text-ink3">Signals seen on their orders</h3>
        {shown.length > 0 ? (
          <>
            <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
              {shown.map((signal, index) => (
                <li key={`${signal.orderId}-${index}`} className="flex items-start gap-2">
                  <Icon name="alert" className="ic-sm mt-0.5 text-warn-fg" />
                  <span className="flex-1">{signal.text}</span>
                  <Link className="link mono" to={orderPath(signal.orderId)}>
                    {orderLabel({ id: signal.orderId, channel: 'b2c' })}
                  </Link>
                </li>
              ))}
            </ul>
            {signals.length > shown.length && (
              <p className="mt-2 text-xs text-ink3">and {signals.length - shown.length} more.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink3">No risk signals on any order.</p>
        )}
      </div>
    </div>
  );
}
