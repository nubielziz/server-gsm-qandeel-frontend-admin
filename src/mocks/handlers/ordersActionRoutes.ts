// Mock of the order action routes (`POST /admin/orders/:id/accept|reply|reject|reopen|refund|verification|notes|dispatch|fetch|
// change-supplier`). Each change is simple; the refusals are the obvious ones (a closed order, a missing reason or reply),
// because the real server owns the rules (decision 014).
import type { HttpHandler } from 'msw';
import { supplierOptions } from '../orders';
import {
  acceptMock,
  changeSupplierMock,
  completeMock,
  dispatchMock,
  fetchMock,
  noteMock,
  refundMock,
  rejectMock,
  reopenMock,
  verifyMock,
} from '../ordersActions';
import { problem } from '../problem';
import { invalid, textOf } from './accessShared';
import { closed, isOpen, orderAction } from './ordersShared';

export const orderActionHandlers: HttpHandler[] = [
  orderAction('accept', (order, _body, actor) => {
    if (order.queue !== 'manual')
      return problem(409, 'NOT_MANUAL', 'Not a manual order', 'Only a manual order can be accepted.');
    acceptMock(order, actor);
  }),

  orderAction('reply', async (order, body, actor) => {
    if (!isOpen(order)) return closed();
    const code = textOf(body.code);
    if (!code) return invalid([{ field: 'code', message: 'Write a reply.' }]);
    await completeMock(order, actor, code, textOf(body.comment) || undefined);
  }),

  orderAction('reject', async (order, body, actor) => {
    if (!isOpen(order)) return closed();
    const reason = textOf(body.reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Choose a reason.' }]);
    await rejectMock(order, actor, reason);
  }),

  orderAction('reopen', async (order, body, actor) => {
    if (order.status !== 'completed') {
      return problem(
        409,
        'ORDER_NOT_COMPLETED',
        'Order is not completed',
        'Only a completed order can be reopened.',
      );
    }
    await reopenMock(order, actor, textOf(body.reason) || undefined);
  }),

  orderAction('refund', async (order, body, actor) => {
    if (order.status !== 'completed') {
      return problem(
        409,
        'ORDER_NOT_COMPLETED',
        'Order is not completed',
        'Only a completed order can be refunded.',
      );
    }
    if (order.channel === 'b2c') {
      return problem(
        409,
        'USE_REFUNDS',
        'Refund from the Refunds page',
        'Storefront orders are refunded from the Refunds page.',
      );
    }
    const reason = textOf(body.reason);
    if (!reason) return invalid([{ field: 'reason', message: 'Add a short reason.' }]);
    await refundMock(order, actor, reason);
  }),

  orderAction('verification', async (order, body, actor) => {
    if (order.queue !== 'verification') {
      return problem(
        409,
        'NOT_IN_VERIFICATION',
        'No verification request',
        'This order has no verification request.',
      );
    }
    if (body.decision !== 'accept' && body.decision !== 'refund') {
      return invalid([{ field: 'decision', message: 'Accept the result or refund.' }]);
    }
    await verifyMock(order, actor, body.decision, textOf(body.note) || undefined);
  }),

  orderAction('notes', (order, body, actor) => {
    const text = textOf(body.body);
    if (!text) return invalid([{ field: 'body', message: 'Write the note first.' }]);
    noteMock(order, actor, text);
  }),

  orderAction('dispatch', (order, _body, actor) => {
    if (!isOpen(order)) return closed();
    dispatchMock(order, actor);
  }),

  orderAction('fetch', (order, _body, actor) => {
    if (!isOpen(order)) return closed();
    if (!order.supplierRef)
      return problem(
        409,
        'NO_REFERENCE',
        'No supplier reference',
        'The supplier has no reference for this order yet.',
      );
    fetchMock(order, actor);
  }),

  orderAction('change-supplier', async (order, body, actor) => {
    if (!isOpen(order)) return closed();
    const supplier = (await supplierOptions()).find((option) => option.id === Number(body.supplierId));
    if (body.supplierId !== undefined && !supplier) {
      return invalid([{ field: 'supplierId', message: 'Choose a supplier.' }]);
    }
    changeSupplierMock(
      order,
      actor,
      supplier && { id: supplier.id, name: supplier.name },
      body.resetReference === true,
    );
  }),
];
