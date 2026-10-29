// OrderDrawerHost: shows the drawer of the order named by `?order=<id>` in the address, with the dialogs it opens. Mount it on any
// page that lists orders (the Orders page, a merchant's or customer's page) and `useOrderDrawer().open(id)` or a link to
// `orderPath(id)` opens the drawer there. `rows` lets the drawer show a row the page already has before it loads the order.
import { useState } from 'react';
import { useOrderDrawer } from '../hooks/useOrderDrawer';
import type { Order } from '../types';
import { OrderDialogs } from './OrderDialogs';
import type { OrderDialogState } from './orderDialogState';
import { OrderDrawer } from './OrderDrawer';

export function OrderDrawerHost({ rows }: { rows?: readonly Order[] }) {
  const drawer = useOrderDrawer();
  const [dialog, setDialog] = useState<OrderDialogState | null>(null);
  return (
    <>
      {/* The drawer comes first and the dialogs after it, so a dialog opened from the drawer sits on top of it. */}
      {drawer.id !== null && (
        <OrderDrawer
          key={drawer.id}
          id={drawer.id}
          row={rows?.find((row) => row.id === drawer.id)}
          onClose={drawer.close}
          onDialog={setDialog}
        />
      )}
      <OrderDialogs dialog={dialog} onChange={setDialog} />
    </>
  );
}
