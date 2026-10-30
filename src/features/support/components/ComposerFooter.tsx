// ComposerFooter: the row under the text box: Send reply / Add note, the order buttons (Refund order…, Cancel and refund…), the
// channel the reply goes out on and the line that says who sees it. Ports the last row of threadView (49-p-support.js). The order
// buttons open the order's drawer, where the refund and cancel dialogs live.
import { Button, Icon, SelectField } from '@/components/ui';
import { isOpen, type Order } from '@/features/orders';
import { REPLY_CHANNEL_LABEL } from '../lib/status';
import type { ReplyChannel } from '../types';

export interface ComposerFooterProps {
  internal: boolean;
  sending: boolean;
  lock: { disabled: boolean; title?: string };
  /** The ways a reply can go out; with more than one the staff member picks. */
  channels: readonly ReplyChannel[];
  channel: ReplyChannel;
  onChannel: (channel: ReplyChannel) => void;
  order: Order | undefined;
  onOpenOrder: (orderId: number) => void;
  onSend: () => void;
}

export function ComposerFooter({
  internal,
  sending,
  lock,
  channels,
  channel,
  onChannel,
  order,
  onOpenOrder,
  onSend,
}: ComposerFooterProps) {
  // The refund buttons are hints for a storefront order; the order's own drawer checks what is possible.
  const refundable = order?.channel === 'b2c' && order.status === 'completed';
  const cancellable = order?.channel === 'b2c' && isOpen(order);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        loading={sending}
        disabled={lock.disabled}
        title={lock.title}
        onClick={onSend}
      >
        <Icon name="send" className="ic-sm" />
        {internal ? 'Add note' : 'Send reply'}
      </Button>
      {!internal && channels.length > 1 && (
        <SelectField
          aria-label="Send by"
          value={channel}
          options={channels.map((value) => ({ value, label: REPLY_CHANNEL_LABEL[value] }))}
          onChange={(event) => onChannel(event.target.value as ReplyChannel)}
        />
      )}
      {order && refundable && (
        <Button onClick={() => onOpenOrder(order.id)}>
          <Icon name="undo" className="ic-sm" />
          Refund order…
        </Button>
      )}
      {order && cancellable && (
        <Button variant="danger" onClick={() => onOpenOrder(order.id)}>
          <Icon name="ban" className="ic-sm" />
          Cancel and refund…
        </Button>
      )}
      <span className="flex-1" />
      <span className="text-xs text-ink3">
        {internal ? 'Only your team sees notes.' : `Sent by ${REPLY_CHANNEL_LABEL[channel].toLowerCase()}.`}
      </span>
    </div>
  );
}
