// CompleteDialog: "Complete <order>" for one or many orders (the demo's completeDialog in 41-p-orders.js): a reply template, the
// reply the buyer sees, and the consequence in money. One order is completed with `reply`; several go through the
// bulk-reply apply call, each with the same reply where `{input}` is replaced by that order's own input (MISMATCHES M23).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextareaField, TextField, toast } from '@/components/ui';
import { money, sum, toAmount } from '@/lib/format';
import { useApplyBulkReply } from '../hooks/useBulkReply';
import { useReplyOrder } from '../hooks/useOrderMutations';
import { ordersText, summarize, type BulkSummary } from '../lib/bulk';
import { defaultReply, fillInput, REPLY_TEMPLATES } from '../lib/reply';
import { orderActions } from '../lib/actions';
import { orderLabel } from '../lib/status';
import type { Order } from '../types';

type Values = { template: string; reply: string; comment: string };

export interface CompleteDialogProps {
  orders: readonly Order[];
  onClose: () => void;
  /** Called when the run is over, for the page to clear its ticks and show failures. */
  onDone: (summary: BulkSummary) => void;
  /** Opens the ledger entries from the success toast. */
  onViewLedger?: (order: Order) => void;
}

/** Only open orders can be completed; the others in a selection are left out of the title and the sums. */
export function CompleteDialog({ orders, onClose, onDone, onViewLedger }: CompleteDialogProps) {
  // Only the orders that offer this action (open and not held by risk).
  const open = orders.filter((order) => orderActions(order).complete);
  const first = open[0];
  const one = open.length === 1;
  const reply = useReplyOrder({ quiet: true, onViewLedger });
  const apply = useApplyBulkReply();
  // With several orders the first one's own input must not be written into everyone's reply: use the placeholder. An
  // empty input is left alone (replacing '' would put the placeholder between every letter).
  const initialReply = first
    ? one || !first.imei
      ? defaultReply(first)
      : defaultReply(first).replaceAll(first.imei, '{input}')
    : '';
  const form = useForm<Values>({ defaultValues: { template: 'custom', reply: initialReply, comment: '' } });
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const text = values.reply.trim();
      if (one) {
        const comment = values.comment.trim();
        await reply.mutateAsync({ order: first, body: { code: text, ...(comment ? { comment } : {}) } });
        onDone(summarize('completed', open, { done: 1, failed: [] }));
        return;
      }
      const result = await apply.mutateAsync({
        items: open.map((order) => ({ orderId: order.id, code: fillInput(text, order) })),
      });
      const failed = new Set(result.failed.map((item) => item.orderId));
      const settled = sum(
        open.filter((order) => !failed.has(order.id)),
        (order) => toAmount(order.totalPrice),
      );
      toast(
        result.applied > 0
          ? {
              kind: 'success',
              title: `${ordersText(result.applied)} completed`,
              body: `${money(settled)} settled to revenue.`,
            }
          : { kind: 'error', title: 'No order was completed', body: result.failed[0]?.title },
      );
      onDone(
        summarize('completed', open, {
          done: result.applied,
          failed: result.failed.map((item) => ({ id: item.orderId, reason: item.title })),
        }),
      );
    },
    // The server names the reply `code`.
    { fields: ['reply', 'comment'], aliases: { code: 'reply' } },
  );

  if (!first) return null;
  const everyStorefront = open.every((order) => order.channel === 'b2c');
  const someStorefront = open.some((order) => order.channel === 'b2c');
  const who = everyStorefront ? 'customer' : someStorefront ? 'buyer' : 'merchant';

  return (
    <FormDialog
      open
      title={one ? `Complete ${orderLabel(first)}` : `Complete ${open.length} orders`}
      sub={`Settles ${money(sum(open, (order) => toAmount(order.totalPrice)))} of revenue and ${money(sum(open, (order) => toAmount(order.totalCost)))} of supplier cost to the ledger.`}
      confirm={one ? 'Complete order' : `Complete ${open.length} orders`}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Reply template"
          selectWrapClassName="w-full"
          options={REPLY_TEMPLATES.map(({ value, label }) => ({ value, label }))}
          {...register('template', {
            onChange: (event) => {
              const picked = REPLY_TEMPLATES.find((item) => item.value === event.target.value);
              if (picked && picked.value !== 'custom')
                setValue('reply', picked.text, { shouldValidate: true });
            },
          })}
        />
        <TextareaField
          label={`Reply sent to the ${who}`}
          rows={3}
          hint={
            one ? undefined : (
              <>
                Use <span className="mono">{'{input}'}</span> to insert each order’s IMEI or account.
              </>
            )
          }
          error={errors.reply}
          {...register('reply', {
            validate: (value) =>
              value.trim() !== '' || 'Write a reply. The merchant sees it as the order result.',
          })}
        />
        {one && (
          <TextField label="Comment (optional)" maxLength={200} autoComplete="off" {...register('comment')} />
        )}
      </div>
    </FormDialog>
  );
}
