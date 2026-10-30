// AdjustWalletDialog: "Adjust wallet" (the demo's `m-adjust` action): a direction, an amount and a reason. The server posts the
// balanced ledger entries and answers with the new balance; if it refuses (for example a debit past the credit limit, or an
// amount that needs a second approver) the dialog shows its message and nothing is posted. The console never works out a balance.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, dialogSubmit } from '@/components/ui';
import { money } from '@/lib/format';
import { useAdjustWallet } from '../hooks/useWalletMutations';
import { parseAmount } from '../lib/amount';
import { cleanText } from '../lib/input';
import type { AdjustDirection, Client, ClientWallet } from '../types';

type Values = { direction: AdjustDirection; amount: string; reason: string };

const DIRECTIONS = [
  { value: 'credit', label: 'Credit (add funds)' },
  { value: 'debit', label: 'Debit (remove funds)' },
];

export interface AdjustWalletDialogProps {
  client: Pick<Client, 'id' | 'name'>;
  /** The balances, for the subtitle; missing while they load or when the staff member cannot read them. */
  wallet?: ClientWallet;
  onClose: () => void;
}

/** Posts a manual credit or debit. The server's refusal shows in the dialog and nothing is posted. */
export function AdjustWalletDialog({ client, wallet, onClose }: AdjustWalletDialogProps) {
  const adjust = useAdjustWallet();
  const form = useForm<Values>({ defaultValues: { direction: 'credit', amount: '', reason: '' } });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = parseAmount(values.amount);
      // The amount rule below stops an unreadable amount before this runs; the check keeps the type honest.
      if (!amount) return 'Enter an amount greater than zero, like 25.00.';
      await adjust.mutateAsync({
        client,
        body: { amount, direction: values.direction, reason: cleanText(values.reason) },
      });
    },
    { fields: ['direction', 'amount', 'reason'] },
  );

  return (
    <FormDialog
      open
      title="Adjust wallet"
      sub={wallet ? `${client.name} · balance ${money(wallet.balance)}` : client.name}
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
            error={errors.amount}
            {...register('amount', {
              validate: (value) =>
                parseAmount(value) !== null || 'Enter an amount greater than zero, like 25.00.',
            })}
          />
        </div>
        <TextField
          label="Reason"
          maxLength={140}
          placeholder="e.g. Refund for duplicate charge"
          autoComplete="off"
          hint="Recorded in the ledger and the audit log."
          error={errors.reason}
          {...register('reason', {
            validate: (value) =>
              cleanText(value).length >= 5 ||
              'Add a reason of at least 5 characters so the entry can be audited later.',
          })}
        />
        <p className="rounded-md bg-sunken p-2.5 text-xs text-ink2">
          Posts a balanced journal against the <span className="mono">adjustments</span> account.
        </p>
      </div>
    </FormDialog>
  );
}
