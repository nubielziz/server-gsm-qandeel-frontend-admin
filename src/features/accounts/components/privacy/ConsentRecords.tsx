// ConsentRecords: the consent records stored with the account's latest shop order (terms, privacy, refund policy, the withdrawal waiver,
// marketing), one line each with the time and the address it came from, and the order they belong to as a link. This is the evidence pack
// attached to a card dispute.
import { Link } from 'react-router';
import { Icon } from '@/components/ui';
import { orderLabel, orderPath } from '@/features/orders';
import { fmtDate } from '@/lib/format';
import type { LatestConsents } from '../../types';
import { consentLabel } from './consentLabel';

/** The lines of the latest order's consent records, or the words that say there is none. */
export function ConsentRecords({ latest }: { latest: LatestConsents | null }) {
  if (!latest) return <p className="text-sm text-ink3 md:min-h-8">No consent recorded: no shop order yet</p>;
  return (
    <>
      <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
        {latest.records.map((record) => (
          <li key={`${record.purpose}-${record.at}`} className="flex items-start gap-2">
            <Icon name="checkCircle" className="ic-sm mt-0.5 text-good-fg" />
            <span className="min-w-0 flex-1">
              <span className="block">{consentLabel(record)}</span>
              <span className="mono block text-2xs text-ink3">
                {fmtDate(record.at)} · IP {record.ip}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs italic text-ink3">
        Stored with the order{' '}
        <Link className="link mono not-italic" to={orderPath(latest.orderId)}>
          {orderLabel({ id: latest.orderId, channel: 'b2c' })}
        </Link>
        . This is the evidence pack attached to a card dispute.
      </p>
    </>
  );
}
