// OrderLink: a storefront order's number that opens the order's drawer in place. Ports the demo's `orderLink`. Without
// `onOpen` (the staff member cannot read orders) it is plain text.
import { storefrontOrderLabel } from '../lib/labels';

export interface OrderLinkProps {
  orderId: number;
  /** Opens the drawer (`?order=<id>`); leave out to show the number as text. */
  onOpen?: (orderId: number) => void;
}

export function OrderLink({ orderId, onOpen }: OrderLinkProps) {
  const label = storefrontOrderLabel(orderId);
  if (!onOpen) return <span className="mono">{label}</span>;
  return (
    <button type="button" className="link mono" onClick={() => onOpen(orderId)}>
      {label}
    </button>
  );
}
