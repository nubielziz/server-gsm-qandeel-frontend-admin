// AdjustWalletDialog: "Adjust the wallet of <name>", for both wallet kinds: a direction (Add | Take), an amount and a reason. The server posts
// the balanced ledger entries and answers with the new balance; when it refuses (past the credit limit, below zero for a store balance, an amount
// over the approval limit, no wallet) the dialog shows its words and nothing is posted. The Idempotency-Key is made once when the dialog opens and
// sent with every retry of that opening, so a retry after a lost answer can never post twice. The console never works out a balance.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormDialog, TextField, YesNo, dialogSubmit } from '@/components/ui';
import { money } from '@/lib/format';
import { useAccountWallet } from '../../hooks/useAccountWallet';
import { useDialogKey } from '../../hooks/useDialogKey';
import { useAccountGrants } from '../frame/useAccountGrants';
import { accountLabel } from '../shared/accountLabel';
import { dialogTitle } from '../shared/dialogTitles';
import type { AccountDialogProps } from '../types';
import {
  parseWalletAmount,
  ADJUST_REASON_MAX,
  ADJUST_REASON_MIN,
  cleanReason,
  directionOf,
  reasonProblem,
} from './walletInput';
import { useAdjustBalance } from './useWalletWrites';

type Values = { amount: string; reason: string };

const AMOUNT_WORDS = 'Enter an amount greater than zero, like 25.00.';

/**
 * Adds to or takes from the wallet of one account. Needs `wallet:adjust` (the part and the menus do not offer it otherwise).
 *
 * @param props.account the account the dialog is about.
 * @param props.onClose asked for when the dialog is done or cancelled.
 * @throws nothing: a refusal stays in the dialog, which stays open.
 * @see POST /admin/clients/:id/wallet/adjust
 */
export function AdjustWalletDialog({ account, onClose }: AccountDialogProps) {
  const grants = useAccountGrants();
  const adjust = useAdjustBalance();
  // One key for this opening: a retry sends the same key, so the server answers the first adjustment instead of posting again.
  const key = useDialogKey();
  const wallet = useAccountWallet(account.id, grants.can('wallet:read'));
  const [add, setAdd] = useState(true);
  const form = useForm<Values>({ defaultValues: { amount: '', reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const balance = wallet.data?.balance ?? account.wallet?.balance;
  const limit = wallet.data?.adjustApprovalLimit;
  const name = accountLabel(account);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = parseWalletAmount(values.amount);
      // The amount rule below stops an unreadable amount before this runs; the check keeps the type honest.
      if (!amount) return AMOUNT_WORDS;
      await adjust.mutateAsync({
        account,
        body: { amount, direction: directionOf(add), reason: cleanReason(values.reason) },
        key,
      });
    },
    {
      fields: ['amount', 'reason'],
      codeFields: {
        APPROVAL_REQUIRED: 'amount',
        CREDIT_LIMIT_EXCEEDED: 'amount',
        INSUFFICIENT_FUNDS: 'amount',
      },
    },
  );

  return (
    <FormDialog
      open
      title={dialogTitle('adjust', [account])}
      sub={balance === undefined ? name : `${name} · balance ${money(balance)}`}
      confirm="Post adjustment"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div>
          <span className="label">Direction</span>
          <YesNo value={add} onChange={setAdd} yes="Add" no="Take" aria-label="Direction" />
        </div>
        <TextField
          label="Amount (USD)"
          inputMode="decimal"
          placeholder="0.00"
          autoComplete="off"
          hint={limit ? `Above ${money(limit)} needs a second approver.` : undefined}
          error={errors.amount}
          {...register('amount', { validate: (value) => parseWalletAmount(value) !== null || AMOUNT_WORDS })}
        />
        <TextField
          label="Reason"
          maxLength={ADJUST_REASON_MAX}
          placeholder="e.g. Refund for duplicate charge"
          autoComplete="off"
          hint="Recorded in the ledger and the audit log."
          error={errors.reason}
          {...register('reason', {
            validate: (value) =>
              reasonProblem(value, ADJUST_REASON_MIN, ADJUST_REASON_MAX, 'the entry') ?? true,
          })}
        />
      </div>
    </FormDialog>
  );
}
