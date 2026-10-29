// OrderReply: "Reply to send when completing", the text box of the drawer for an open order. Ports the `reply` textarea of orderDrawer
// in 41-p-orders.js. The Complete button of the footer sends what is in it. The text is kept by the drawer, so it survives
// the drawer re-drawing after a refresh.
import { TextareaField } from '@/components/ui';
import { replyFieldId } from '../lib/reply';
import type { Order } from '../types';

export interface OrderReplyProps {
  order: Order;
  value: string;
  onChange: (value: string) => void;
}

export function OrderReply({ order, value, onChange }: OrderReplyProps) {
  return (
    <TextareaField
      id={replyFieldId(order)}
      wrapperClassName="mb-5"
      label="Reply to send when completing"
      rows={2}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
