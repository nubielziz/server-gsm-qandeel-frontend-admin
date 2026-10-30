// DeletePriceDialog: "Remove the override for <service>?" with a review step (the demo's `m-ov-del` removed it at once). The
// merchant pays the group price on that service again from the next order.
import { ConfirmDialog } from '@/components/ui';
import { money } from '@/lib/format';
import { useDeletePrice } from '../hooks/useClientPrices';
import type { Client, ClientPrice } from '../types';

/** Asks before removing an override, and says what the merchant pays instead. */
export function DeletePriceDialog({
  client,
  price,
  onClose,
}: {
  client: Pick<Client, 'name'>;
  price: ClientPrice;
  onClose: () => void;
}) {
  const remove = useDeletePrice();
  return (
    <ConfirmDialog
      open
      title={`Remove the override for ${price.service.name}?`}
      body={
        <p>
          {client.name} pays{' '}
          {price.groupPrice ? `the group price of ${money(price.groupPrice)}` : 'the group price'} on this
          service again from the next order, instead of {money(price.price)}.
        </p>
      }
      confirm="Remove override"
      kind="danger"
      onClose={onClose}
      onConfirm={() => remove.mutateAsync(price).then(() => undefined)}
    />
  );
}
