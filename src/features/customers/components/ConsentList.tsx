// ConsentList: the consent records stored with the customer's latest order (terms, privacy, refund policy, the withdrawal
// waiver, marketing), each with the time and the address it came from. Ports the left column of the Consents tab in
// pageCustomer (48-p-customers.js); the demo worked the rows out from the order, the server sends them (CUSTOMERS-7).
import { Icon } from '@/components/ui';
import { orderLabel } from '@/features/orders';
import { fmtDate } from '@/lib/format';
import { consentLabel } from '../lib/text';
import type { LatestConsents } from '../types';

export function ConsentList({ latest }: { latest: LatestConsents | null }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-ink3">
        Consent record for the latest order
        {latest ? ` (${orderLabel({ id: latest.orderId, channel: 'b2c' })})` : ''}
      </h3>
      {latest ? (
        <>
          <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
            {latest.records.map((record) => (
              <li
                key={`${record.purpose}-${record.at}`}
                className="flex items-start gap-2.5 px-3 py-2 text-sm"
              >
                <Icon name="checkCircle" className="ic-sm mt-0.5 text-good-fg" />
                <div className="min-w-0 flex-1">
                  <p>{consentLabel(record)}</p>
                  <p className="mono text-2xs text-ink3">
                    {fmtDate(record.at)} · IP {record.ip}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink3">
            This is the evidence pack attached to a card dispute. It is stored with the order.
          </p>
        </>
      ) : (
        <p className="text-sm text-ink3">No orders, so no consent was recorded.</p>
      )}
    </div>
  );
}
