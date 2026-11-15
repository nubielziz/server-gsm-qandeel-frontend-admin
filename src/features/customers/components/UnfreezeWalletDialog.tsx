// UnfreezeWalletDialog: "Lift the hold?": the balance can be spent again. The server refuses while the balance is below zero or a
// dispute of one of the customer's top-ups is open, and the dialog shows its message. New in feature 21.
import { useUnfreezeCustomerWallet } from '../hooks/useWalletMutations';
import type { Customer } from '../types';
import { WalletReasonDialog } from './WalletReasonDialog';
import { customerLabel } from '@/lib/format';

/** Lifts the hold on the customer's balance with a reason. */
export function UnfreezeWalletDialog({
  customer,
  onClose,
}: {
  customer: Pick<Customer, 'id' | 'name' | 'email'>;
  onClose: () => void;
}) {
  const unfreeze = useUnfreezeCustomerWallet();
  return (
    <WalletReasonDialog
      title={`Lift the hold on ${customerLabel(customer)}’s balance?`}
      sub="They can pay from the balance and top up by card again."
      confirm="Lift hold"
      note="Refused while the balance is below zero or a dispute of one of their top-ups is open."
      onSend={(reason, key) => unfreeze.mutateAsync({ customer, body: { reason }, key })}
      onClose={onClose}
    />
  );
}
