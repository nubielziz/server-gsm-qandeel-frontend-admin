// AdjustWalletDialog: "Adjust balance" for a customer: a direction, an amount and a reason. The server posts the balanced journal
// and answers with the new balance; when it refuses (a debit below zero, an amount over the approval limit, a customer with no
// account) the dialog shows its message and nothing is posted. The Idempotency-Key is made once when the dialog opens and sent with
// every retry of that opening, so a double click or a retry can never post twice. The console never works out a balance.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { customerLabel, money } from '@/lib/format';
import { useAdjustCustomerWallet } from '../hooks/useWalletMutations';
import { cleanReason, newIdempotencyKey, parseWalletAmount } from '../lib/walletInput';
import type { Customer, CustomerWallet, WalletDirection } from '../types';

type Values = { direction: WalletDirection; amount: string; reason: string };

const DIRECTIONS = [
  { value: 'credit', label: 'Credit (add to balance)' },
  { value: 'debit', label: 'Debit (take from balance)' },
];

export interface AdjustWalletDialogProps {
  customer: Pick<Customer, 'id' | 'name' | 'email'>;
  /** The figures, for the subtitle and the approval limit. */
  wallet: CustomerWallet;
  onClose: () => void;
}

/** Posts a manual credit or debit. The server's refusal shows in the dialog and nothing is posted. */
export function AdjustWalletDialog({ customer, wallet, onClose }: AdjustWalletDialogProps) {
  const adjust = useAdjustCustomerWallet();
  // One key for this opening: a retry sends the same key, so the server answers the first adjustment instead of posting again.
  const [key] = useState(newIdempotencyKey);
  const form = useForm<Values>({ defaultValues: { direction: 'credit', amount: '', reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = parseWalletAmount(values.amount);
      // The amount rule below stops an unreadable amount before this runs; the check keeps the type honest.
      if (!amount) return 'Enter an amount greater than zero, like 25.00.';
      await adjust.mutateAsync({
        customer,
        body: { amount, direction: values.direction, reason: cleanReason(values.reason) },
        key,
      });
    },
    {
      fields: ['direction', 'amount', 'reason'],
      codeFields: { APPROVAL_REQUIRED: 'amount', INSUFFICIENT_FUNDS: 'amount' },
    },
  );

  return (
    <FormDialog
      open
      title="Adjust balance"
      sub={`${customerLabel(customer)} · balance ${money(wallet.balance)}`}
      confirm="Post adjustment"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Direction"
            selectWrapClassName="w-full"
            options={DIRECTIONS}
            error={errors.direction}
            {...register('direction')}
          />
          <TextField
            label="Amount (USD)"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            hint={`Above ${money(wallet.adjustApprovalLimit)} needs a second approver.`}
            error={errors.amount}
            {...register('amount', {
              validate: (value) =>
                parseWalletAmount(value) !== null || 'Enter an amount greater than zero, like 25.00.',
            })}
          />
        </div>
        <TextField
          label="Reason"
          maxLength={140}
          placeholder="e.g. Goodwill credit for a slow unlock"
          autoComplete="off"
          hint="Recorded in the ledger and the audit log. The customer is told the balance changed, not why."
          error={errors.reason}
          {...register('reason', {
            validate: (value) =>
              cleanReason(value).length >= 5 ||
              'Add a reason of at least 5 characters so the entry can be audited later.',
          })}
        />
        <p className="rounded-md bg-sunken p-2.5 text-xs text-ink2">
          Posts a balanced journal against the <span className="mono">adjustments</span> account. A credit
          needs a customer with an account; a debit cannot take the balance below zero.
        </p>
      </div>
    </FormDialog>
  );
}
