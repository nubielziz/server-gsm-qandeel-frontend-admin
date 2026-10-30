// RerouteOrderList: the open orders the reroute will move, oldest first: the order number, the service and its status. The
// list is what the server returned for this supplier's open orders (`GET /admin/orders?supplierId=…`), up to the run's limit.
import { OrderStatusBadge, orderLabel, type Order } from '@/features/orders';

export function RerouteOrderList({ orders }: { orders: readonly Order[] }) {
  return (
    <div className="tbl-wrap max-h-56 rounded-md border border-line">
      <table className="tbl" aria-label="Open orders to move">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Service</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="mono whitespace-nowrap">{orderLabel(order)}</td>
              <td className="max-w-[240px] truncate">{order.service.name}</td>
              <td>
                <OrderStatusBadge order={order} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
