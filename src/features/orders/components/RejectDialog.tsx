// RejectDialog: "Reject <order>" (or "Cancel <order>" for a storefront order) for one or many orders. Ports rejectDialog of
// 41-p-orders.js: a reason from the list or a typed one, and the refund the buyer gets written before the button. The
// API has no bulk reject, so each order gets its own call, one after another, with a progress line (MISMATCHES M23).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextField, toast } from '@/components/ui';
import { money, sum, toAmount } from '@/lib/format';
import { useBulkReject } from '../hooks/useBulkReject';
import { ordersText, summarize, type BulkSummary } from '../lib/bulk';
import { orderGross } from '../lib/money';
import { REJECT_REASONS } from '../lib/reply';
import { orderActions } from '../lib/actions';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';

type Values = { reason: string; other: string };

const OTHER = 'other';
const REASONS = [
  { value: '', label: 'Choose a reason' },
  ...REJECT_REASONS.map((reason) => ({ value: reason, label: reason })),
  { value: OTHER, label: 'Other…' },
];

export interface RejectDialogProps {
  orders: readonly Order[];
  onClose: () => void;
  /** Called when the run is over, for the page to clear its ticks and show failures. */
  onDone: (summary: BulkSummary) => void;
}

// The sentence under the title: who is refunded, how much and where (the three cases of the demo).
function consequence(open: readonly Order[]): string {
  if (open.every((order) => order.channel === 'b2c')) {
    const gross = sum(open, orderGross);
    return `${open.length === 1 ? 'The customer is' : 'The customers are'} refunded ${money(gross)} to the original payment method and told why.`;
  }
  if (open.some((order) => order.channel === 'b2c')) {
    return 'Merchants are refunded to their wallet and customers to their card. Both see the reason.';
  }
  return `The merchant is refunded ${money(sum(open, (order) => toAmount(order.totalPrice)))} straight away and sees the reason.`;
}

export function RejectDialog({ orders, onClose, onDone }: RejectDialogProps) {
  // Only the orders that offer this action (open and not held by risk).
  const open = orders.filter((order) => orderActions(order).reject);
  const bulk = useBulkReject();
  const form = useForm<Values>({ defaultValues: { reason: '', other: '' } });
  const {
    register,
    watch,
    getValues,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const reason = values.reason === OTHER ? values.other.trim() : values.reason;
      const outcome = await bulk.reject(
        open.map((order) => order.id),
        reason,
      );
      // One order that was refused stays in the dialog with the server's words; several get the summary.
      if (open.length === 1 && outcome.failed.length === 1) return outcome.failed[0].reason;

      const refused = new Set(outcome.failed.map((failure) => failure.id));
      const rejected = open.filter((order) => !refused.has(order.id));
      const cards = rejected.length > 0 && rejected.every((order) => order.channel === 'b2c');
      toast(
        outcome.done > 0
          ? {
              kind: 'success',
              title: `${ordersText(outcome.done)} rejected`,
              body: cards
                ? `${money(sum(rejected, orderGross))} refunded to cards.`
                : `${money(sum(rejected, (order) => toAmount(order.totalPrice)))} refunded to wallets.`,
            }
          : { kind: 'error', title: 'No order was rejected', body: outcome.failed[0]?.reason },
      );
      onDone(summarize('rejected', open, outcome));
    },
    { fields: ['reason', 'other'] },
  );

  if (open.length === 0) return null;
  const everyStorefront = open.every((order) => order.channel === 'b2c');
  const progress = bulk.progress;

  return (
    <FormDialog
      open
      title={
        open.length === 1
          ? `${everyStorefront ? 'Cancel' : 'Reject'} ${orderLabel(open[0])}`
          : `Reject ${open.length} orders`
      }
      sub={consequence(open)}
      confirm={everyStorefront ? 'Cancel and refund' : 'Reject and refund'}
      kind="danger"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Reason"
          selectWrapClassName="w-full"
          options={REASONS}
          error={errors.reason}
          {...register('reason', { required: 'Choose a reason. The merchant sees it with the refund.' })}
        />
        {watch('reason') === OTHER && (
          <TextField
            label="Reason shown to the buyer"
            maxLength={120}
            placeholder="Short and specific"
            autoComplete="off"
            error={errors.other}
            {...register('other', {
              validate: (value) =>
                getValues('reason') !== OTHER ||
                value.trim() !== '' ||
                'Add the reason the merchant should see.',
            })}
          />
        )}
        {progress && progress.total > 1 && (
          <p className="text-sm text-ink2" role="status">
            {progress.verb} {progress.done} of {progress.total}…
          </p>
        )}
      </div>
    </FormDialog>
  );
}
