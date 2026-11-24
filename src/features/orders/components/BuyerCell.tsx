// BuyerCell: the Buyer column. The account with its rank, and how the order arrived: a merchant rank shows the door (API, portal), a
// store order the masked email of an account that has a name. An account with no name is shown by the masked email, once.
import { TypeTag } from '@/components/ui';
import { hasAccountName, maskedAccountLabel, maskEmail } from '@/lib/format';
import { sourceLabel } from '../lib/status';
import type { Order } from '../types';

export function BuyerCell({ order }: { order: Order }) {
  const { account } = order;
  return (
    <>
      <span className="block max-w-[170px] truncate">{maskedAccountLabel(account)}</span>
      <span className="block max-w-[170px] truncate text-2xs text-ink3">
        <TypeTag className="me-1">{account.rank.name}</TypeTag>
        {order.channel === 'b2c' ? (
          hasAccountName(account) ? (
            maskEmail(account.email)
          ) : (
            ''
          )
        ) : (
          <span className="mono">{sourceLabel(order.source)}</span>
        )}
      </span>
    </>
  );
}
