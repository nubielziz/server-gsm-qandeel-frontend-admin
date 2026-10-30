// ApproveRefundDialog: "Approve <refund>", for the full amount or a part of it. Ports the rf-approve dialog of 53-p-refunds.js:
// the customer, the order and what was paid, their reason, the amount to send back, the warning that a delivered unlock does
// not give the supplier cost back, and how the money returns. The VAT part and the ledger entry are the server's: the dialog
// only says that VAT goes back in proportion and then shows what the server answered.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, Icon, TextField } from '@/components/ui';
import { lm, money } from '@/lib/format';
import { useRefund } from '../hooks/useRefund';
import { useApproveRefund } from '../hooks/useRefundMutations';
import { compareMoney, editableAmount, isPositive, parseAmount } from '../lib/amount';
import { badgeFor, REFUND_BADGE, refundLabel, storefrontOrderLabel } from '../lib/labels';
import { isDelivered } from '../lib/refund';
import type { Refund } from '../types';

type Values = { amount: string };

export interface ApproveRefundDialogProps {
  /** The list row. The dialog reads the refund again, in case someone decided it meanwhile. */
  refund: Refund;
  onClose: () => void;
  /** Adds "Show entries" to the success toast; leave out for staff who may not read the ledger. */
  onShowEntries?: (orderId: number) => void;
}

export function ApproveRefundDialog({ refund: row, onClose, onShowEntries }: ApproveRefundDialogProps) {
  const { refund } = useRefund(row);
  const approve = useApproveRefund({ onShowEntries });
  const form = useForm<Values>({ defaultValues: { amount: editableAmount(row.amount) } });
  const {
    register,
    formState: { errors },
  } = form;

  const { payment, order } = refund;
  const paid = lm(payment.amount, refund.currency, refund.fx);
  const decided = refund.status !== 'requested';
  const decidedText = `${refundLabel(refund.id)} was already decided by someone else (${badgeFor(REFUND_BADGE, refund.status).label}).`;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const amount = parseAmount(values.amount);
      // Left alone, the amount on the request goes back; the server is told only about a change.
      const changed = amount !== null && compareMoney(amount, refund.amount) !== 0;
      await approve.mutateAsync({ refund, body: changed ? { amount } : {} });
    },
    { fields: ['amount'] },
  );

  return (
    <FormDialog
      open
      title={`Approve ${refundLabel(refund.id)}`}
      sub={`${refund.customer?.name ?? 'Unknown customer'} · ${storefrontOrderLabel(order.id)} · paid ${paid}${refund.currency !== 'USD' ? ` (${money(payment.amount)})` : ''}`}
      confirm="Refund now"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        {decided && (
          <p className="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg" role="status">
            <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
            <span>{decidedText}</span>
          </p>
        )}
        <p className="rounded-md bg-sunken p-2.5 text-sm text-ink2">
          <span className="text-xs text-ink3">Their reason</span>
          <br />
          {refund.reason}
        </p>
        <TextField
          label="Refund amount (USD)"
          className="mono"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          hint={`Up to ${money(payment.amount)}. Enter less to refund only part of the order.`}
          error={errors.amount}
          {...register('amount', {
            validate: (value) => {
              const amount = parseAmount(value);
              const ok = amount !== null && isPositive(amount) && compareMoney(amount, payment.amount) <= 0;
              return ok || `Enter an amount between $0.01 and ${money(payment.amount)}.`;
            },
          })}
        />
        {isDelivered(refund) && (
          <p className="flex gap-2 rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">
            <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
            <span>
              The unlock was delivered, so the supplier cost of {money(order.cost)} is not coming back. You
              lose that on a full refund.
            </span>
          </p>
        )}
        {isPositive(payment.taxAmount) && (
          <p className="text-xs text-ink3">
            This payment includes {money(payment.taxAmount)} of VAT. It goes back in proportion to the amount
            you refund; the ledger entry shows the exact split.
          </p>
        )}
        {payment.method === 'crypto' ? (
          <p className="flex gap-2 rounded-md bg-sunken p-2.5 text-sm text-ink2">
            <Icon name="info" className="ic-sm mt-0.5 flex-none" />
            <span>
              This was paid in crypto, which the gateway cannot reverse. Mark it as paid after you send the
              USDT yourself.
            </span>
          </p>
        ) : (
          <p className="text-xs text-ink3">
            Goes back to the same card. It shows on their statement in 5 to 10 days.
          </p>
        )}
      </div>
    </FormDialog>
  );
}
