// RemovePriceDialog: "Remove the fixed price of <service>?" with a review step. From the next order the account pays its rank's price on
// that service again. Orders already placed keep the price they were made at.
import { ConfirmDialog } from '@/components/ui';
import { money } from '@/lib/format';
import { useDeletePrice } from '../../hooks/useAccountPrices';
import type { AccountPrice, AccountRow } from '../../types';

/** Asks before removing a fixed price, and says what the account pays instead. */
export function RemovePriceDialog({
  rank,
  price,
  onClose,
}: {
  rank: Pick<AccountRow['rank'], 'name'>;
  price: AccountPrice;
  onClose: () => void;
}) {
  const remove = useDeletePrice();
  return (
    <ConfirmDialog
      open
      title={`Remove the fixed price of ${price.service.name}?`}
      body={
        <p>
          From the next order this account pays the {rank.name} price on {price.service.name} again
          {price.groupPrice ? ` (${money(price.groupPrice)} instead of ${money(price.price)})` : ''}.
        </p>
      }
      confirm="Remove fixed price"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(price).then(() => undefined)}
    />
  );
}
