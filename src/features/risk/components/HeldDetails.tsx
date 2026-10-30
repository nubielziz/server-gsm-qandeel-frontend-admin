// HeldDetails: the middle of a held order's card: "Why it was held" (the signals the server found) and "Who is buying" (the
// customer, their masked email, country and history). Ports the second block of `heldCard` in 54-p-risk.js.
import { Link } from 'react-router';
import { Badge, Icon, KeyValue } from '@/components/ui';
import { maskEmail } from '@/lib/format';
import { countryName } from '../lib/countries';
import { riskLevel } from '../lib/labels';
import { historyText } from '../lib/queue';
import type { HeldOrder } from '../types';

export function HeldDetails({ order }: { order: HeldOrder }) {
  const { customer } = order;
  const level = riskLevel(customer.riskLevel);
  return (
    <div className="grid gap-4 p-3.5 md:grid-cols-2">
      <div>
        <h3 className="mb-1.5 text-xs font-medium text-ink3">Why it was held</h3>
        <ul className="m-0 list-none space-y-1 p-0">
          {order.signals.length > 0 ? (
            order.signals.map((signal, index) => (
              <li key={`${index}-${signal}`} className="flex items-start gap-2 text-sm">
                <Icon name="alert" className="ic-sm mt-0.5 flex-none text-warn-fg" />
                {signal}
              </li>
            ))
          ) : (
            <li className="text-sm text-ink3">No single signal, the combined score was high.</li>
          )}
        </ul>
      </div>
      <div>
        <h3 className="mb-1.5 text-xs font-medium text-ink3">Who is buying</h3>
        <KeyValue
          rows={[
            [
              'Customer',
              <>
                <Link className="link" to={`/customers/${customer.id}`}>
                  {customer.name}
                </Link>{' '}
                <Badge tone={level.tone}>{level.label} risk</Badge>
              </>,
            ],
            ['Email', maskEmail(customer.email)],
            ['Country', countryName(customer.country)],
            ['History', historyText(customer.history)],
          ]}
        />
      </div>
    </div>
  );
}
