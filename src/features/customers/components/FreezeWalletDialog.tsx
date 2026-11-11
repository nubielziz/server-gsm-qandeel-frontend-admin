// FreezeWalletDialog: "Put the balance on hold?": stops paying from the balance and card top-ups; bank top-ups, credits, refunds and
// staff adjustments still work. The customer is emailed. New in feature 21.
import { useFreezeCustomerWallet } from '../hooks/useWalletMutations';
import type { Customer } from '../types';
import { WalletReasonDialog } from './WalletReasonDialog';

/** Freezes the customer's balance with a reason. */
export function FreezeWalletDialog({
  customer,
  onClose,
}: {
  customer: Pick<Customer, 'id' | 'name'>;
  onClose: () => void;
}) {
  const freeze = useFreezeCustomerWallet();
  return (
    <WalletReasonDialog
      title={`Put ${customer.name}’s balance on hold?`}
      sub="They cannot pay from the balance or top up by card until you lift the hold."
      confirm="Put on hold"
      kind="danger"
      note="Bank top-ups, refunds and staff adjustments still work. The customer is emailed."
      onSend={(reason, key) => freeze.mutateAsync({ customer, body: { reason }, key })}
      onClose={onClose}
    />
  );
}
