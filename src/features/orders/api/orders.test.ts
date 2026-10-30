// Tests for the orders API functions, run against the dev mock API (`mockServer`): each one reaches its route with the body of
// its assumed contract and reads the answer the way the screens do. The mock keeps simple state, so an action can be
// checked by reading the order (and its timeline and ledger entries) again.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listLedgerTransactions } from '@/features/finance';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { toListQuery } from '../lib/filters';
import { ORDER_TABS, tabFilters } from '../lib/status';
import {
  acceptOrder,
  addOrderNote,
  applyBulkReply,
  changeOrderSupplier,
  decideVerification,
  dispatchOrder,
  exportOrders,
  fetchOrderResult,
  getOrder,
  listOrderEvents,
  listOrders,
  orderFileUrl,
  previewBulkReply,
  refundOrder,
  rejectOrder,
  reopenOrder,
  replyOrder,
} from '.';

setupMockApi();
// Every test starts signed in as Rami, the Owner.
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Orders of the mock seed (taken from the demo; see src/mocks/orders.ts).
const MANUAL = 48842; // a queued merchant order made into a manual one
const TIMED_OUT = 48799; // sent to a supplier that timed out: queue needs_attention, has a supplier reference
const NORMAL = 48859; // the newest, processing normally
const DELIVERED = 48100; // the oldest, completed
const VERIFYING = 48841; // delivered, waiting for a verification decision
const HELD = 20490; // a paid storefront order the risk engine holds
const STOREFRONT_DONE = 20400; // a delivered storefront order

const total = async (filters: Parameters<typeof toListQuery>[0]) =>
  (await listOrders(toListQuery(filters, { start: 0, end: 1 }))).total;

describe('listOrders', () => {
  it('counts every tab with a one-row call and reads the total from the header', async () => {
    const counts: Record<string, number> = {};
    for (const tab of ORDER_TABS) counts[tab.id] = await total(tabFilters(tab.id));
    expect(counts).toEqual({
      open: 48,
      review: 15,
      queued: 6,
      processing: 37,
      completed: 766,
      rejected: 50,
      all: 864,
    });
  });

  it('puts the review queues of the map under "Needs review" and the rest under Processing', async () => {
    const review = await listOrders(toListQuery(tabFilters('review')));
    const queues = review.data.map((order) => order.queue);
    expect(new Set(queues)).toEqual(new Set(['manual', 'needs_attention', 'verification', 'review']));
    expect(review.data.find((order) => order.id === MANUAL)).toMatchObject({
      status: 'pending',
      queue: 'manual',
    });
    expect(review.data.find((order) => order.id === TIMED_OUT)).toMatchObject({ status: 'processing' });
    expect(review.data.find((order) => order.id === HELD)).toMatchObject({ channel: 'b2c', queue: 'review' });
  });

  it('pages and sorts on the server, newest first', async () => {
    const page = await listOrders({ start: 0, end: 3, sort: ['createdAt'], order: ['desc'] });
    expect(page.total).toBe(864);
    expect(page.data.map((order) => order.id)).toEqual([48859, 48858, 20503]);
    const cheapest = await listOrders({ start: 0, end: 1, sort: ['totalPrice'], order: ['asc'] });
    expect(Number(cheapest.data[0].totalPrice)).toBeLessThanOrEqual(0.2);
  });

  it('filters by channel, type, supplier, merchant and text', async () => {
    expect(await total({ channel: 'b2c' })).toBe(104);
    const imei = await listOrders(toListQuery({ type: 'imei' }));
    expect(imei.data.every((order) => order.service.type === 'imei')).toBe(true);
    const byMerchant = await listOrders(toListQuery({ clientId: 13 }));
    expect(byMerchant.total).toBeGreaterThan(0);
    expect(byMerchant.data.every((order) => order.client?.id === 13)).toBe(true);
    const bySupplier = await listOrders(toListQuery({ supplierId: 1 }));
    expect(bySupplier.data.every((order) => order.supplier?.id === 1)).toBe(true);
    expect((await listOrders({ q: '48100' })).data.map((order) => order.id)).toEqual([DELIVERED]);
    expect((await listOrders({ q: '354607116588777' })).data.some((order) => order.id === NORMAL)).toBe(true);
  });

  it('finds the open orders that are past their SLA, never the ones waiting for a person', async () => {
    const late = await listOrders(toListQuery({ pastSla: true }));
    expect(late.total).toBeGreaterThan(0);
    expect(
      late.data.every(
        (order) =>
          ['pending', 'processing'].includes(order.status) &&
          !order.queue?.match(/^(manual|needs_attention|verification|review)$/),
      ),
    ).toBe(true);
  });
});

describe('getOrder and listOrderEvents', () => {
  it('reads one order with its joins', async () => {
    expect(await getOrder(NORMAL)).toMatchObject({
      id: NORMAL,
      status: 'processing',
      channel: 'b2b',
      service: { name: 'T-Mobile USA Unlock', type: 'imei', slaMinutes: 1440 },
      client: { name: 'Muscat Mobile Clinic' },
      supplier: { name: 'Nordic GSM' },
      customer: null,
    });
  });

  it('answers 404 for an order that does not exist', async () => {
    await expect(getOrder(1)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('reads the timeline with who did each step', async () => {
    const events = await listOrderEvents(DELIVERED);
    expect(events.map((event) => event.type)).toEqual([
      'created',
      'hold',
      'dispatch',
      'ack',
      'completed',
      'settle',
    ]);
    expect(events[0].actor).toMatchObject({ type: 'client' });
    expect(events[2].actor).toMatchObject({ type: 'system' });
  });
});

describe('order actions', () => {
  it('accepts a manual order, which moves to processing', async () => {
    await acceptOrder(MANUAL);
    expect(await getOrder(MANUAL)).toMatchObject({ status: 'processing', queue: null });
    expect((await listOrderEvents(MANUAL)).at(-1)).toMatchObject({ type: 'accepted' });
  });

  it('refuses to accept an order that is not manual', async () => {
    await expect(acceptOrder(NORMAL)).rejects.toMatchObject({ status: 409, code: 'NOT_MANUAL' });
  });

  it('completes an order with its reply and comment, and posts the settlement to the ledger', async () => {
    await replyOrder(NORMAL, { code: 'Unlocked. Restart the phone.', comment: 'Done by hand' });
    expect(await getOrder(NORMAL)).toMatchObject({
      status: 'completed',
      queue: null,
      result: { code: 'Unlocked. Restart the phone.', comment: 'Done by hand' },
    });
    const { data } = await listLedgerTransactions({ filters: { refType: 'order', refId: NORMAL } });
    const settle = data.find((entry) => entry.kind === 'order_settle');
    expect(settle?.entries.map((line) => line.account.kind)).toEqual([
      'client_hold',
      'revenue',
      'cogs',
      'supplier_prepaid',
    ]);
    expect(settle?.entries.reduce((sum, line) => sum + Number(line.amount), 0)).toBeCloseTo(0);
  });

  it('asks for a reply, and refuses an order that is already closed', async () => {
    await expect(replyOrder(NORMAL, { code: '  ' })).rejects.toMatchObject({ status: 422 });
    await expect(replyOrder(DELIVERED, { code: 'x' })).rejects.toMatchObject({
      status: 409,
      code: 'ORDER_NOT_OPEN',
    });
  });

  it('rejects an order with a reason and releases the money', async () => {
    await rejectOrder(NORMAL, { reason: 'IMEI is blacklisted' });
    expect(await getOrder(NORMAL)).toMatchObject({
      status: 'rejected',
      result: { code: 'IMEI is blacklisted' },
    });
    const kinds = (await listLedgerTransactions({ filters: { refType: 'order', refId: NORMAL } })).data.map(
      (entry) => entry.kind,
    );
    expect(kinds).toContain('order_release');
    await expect(rejectOrder(NORMAL, { reason: 'again' })).rejects.toMatchObject({ status: 409 });
    await expect(rejectOrder(TIMED_OUT, { reason: '' })).rejects.toMatchObject({ status: 422 });
  });

  it('reopens a completed order, and only a completed one', async () => {
    await reopenOrder(DELIVERED, { reason: 'Result did not work' });
    expect(await getOrder(DELIVERED)).toMatchObject({ status: 'processing', completedAt: null });
    await expect(reopenOrder(NORMAL)).rejects.toMatchObject({ status: 409, code: 'ORDER_NOT_COMPLETED' });
  });

  it('refunds a completed merchant order, but sends a storefront refund to the Refunds page', async () => {
    await refundOrder(DELIVERED, { reason: 'Goodwill' });
    expect(await getOrder(DELIVERED)).toMatchObject({ status: 'rejected' });
    await expect(refundOrder(STOREFRONT_DONE, { reason: 'x' })).rejects.toMatchObject({
      code: 'USE_REFUNDS',
    });
  });

  it('answers a verification request by accepting the result or refunding', async () => {
    await decideVerification(VERIFYING, { decision: 'accept', note: 'Checked with the supplier' });
    expect(await getOrder(VERIFYING)).toMatchObject({
      status: 'completed',
      queue: null,
      verificationStatus: 'accepted',
    });
    await decideVerification(48851, { decision: 'refund' });
    expect(await getOrder(48851)).toMatchObject({ status: 'rejected', verificationStatus: 'refunded' });
    await expect(decideVerification(NORMAL, { decision: 'accept' })).rejects.toMatchObject({ status: 409 });
  });

  it('adds an internal note to the timeline', async () => {
    await addOrderNote(NORMAL, { body: 'Called the merchant' });
    expect((await listOrderEvents(NORMAL)).at(-1)).toMatchObject({
      type: 'note',
      data: { body: 'Called the merchant' },
    });
    await expect(addOrderNote(NORMAL, { body: ' ' })).rejects.toMatchObject({ status: 422 });
  });

  it('sends an order to the supplier again, and asks the supplier for the result', async () => {
    await dispatchOrder(TIMED_OUT);
    expect(await getOrder(TIMED_OUT)).toMatchObject({ status: 'processing', queue: null, attempts: 4 });
    await fetchOrderResult(NORMAL);
    expect((await listOrderEvents(NORMAL)).at(-1)).toMatchObject({ type: 'fetch' });
    await expect(fetchOrderResult(MANUAL)).rejects.toMatchObject({ code: 'NO_REFERENCE' });
  });

  it('changes the supplier and can forget the old reference', async () => {
    await changeOrderSupplier(NORMAL, { supplierId: 2, resetReference: true });
    expect(await getOrder(NORMAL)).toMatchObject({
      supplier: { id: 2, name: 'Gulf Server Hub' },
      supplierRef: null,
    });
    await expect(changeOrderSupplier(NORMAL, { supplierId: 999 })).rejects.toMatchObject({ status: 422 });
  });
});

describe('bulk reply', () => {
  it('reads each pasted line and says what it matches', async () => {
    const { lines } = await previewBulkReply({
      text: [
        '354607116588777 UNLOCK-1', // the newest order, open
        '000000000000000 UNLOCK-2', // no such order
        '354607116588777', // no code
        '', // blank lines are skipped
      ].join('\n'),
    });
    expect(lines.map((line) => [line.line, line.status, line.orderId])).toEqual([
      [1, 'matched', NORMAL],
      [2, 'not_found', null],
      [3, 'invalid', null],
    ]);
    expect(lines[0]).toMatchObject({ imei: '354607116588777', code: 'UNLOCK-1' });
  });

  it('keeps a closed order out of the match', async () => {
    const delivered = await getOrder(48101); // delivered, and no open order shares its IMEI
    const { lines } = await previewBulkReply({ text: `${delivered.imei}, CODE-9` });
    expect(lines[0].status).toBe('not_open');
  });

  it('applies the matched replies and reports the ones it could not', async () => {
    const result = await applyBulkReply({
      items: [
        { orderId: NORMAL, code: 'A1' },
        { orderId: DELIVERED, code: 'B2' },
      ],
    });
    expect(result).toEqual({
      applied: 1,
      failed: [{ orderId: DELIVERED, title: 'The order is already closed.' }],
    });
    expect((await getOrder(NORMAL)).result.code).toBe('A1');
  });
});

describe('export and files', () => {
  it('downloads the orders that match the filters as a CSV file', async () => {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let url = '';
    mockServer.use(
      http.get('*/admin/orders/export', ({ request }) => {
        url = request.url;
        return new HttpResponse('id\n1\n', {
          headers: { 'Content-Disposition': 'attachment; filename="orders.csv"' },
        });
      }),
    );
    const name = await exportOrders(
      toListQuery({ status: 'completed', q: 'abc' }, { sort: ['createdAt'], order: ['desc'] }),
      'fallback.csv',
    );
    expect(name).toBe('orders.csv');
    expect(created).toHaveLength(1);
    const params = new URL(url).searchParams;
    expect(params.get('status')).toBe('completed');
    expect(params.get('q')).toBe('abc');
    expect(params.get('_sort')).toBe('createdAt');
    expect(params.has('_start')).toBe(false);
  });

  it('builds the file link from the API address, with the id in the path', () => {
    expect(orderFileUrl(77)).toBe('http://api.test/admin/files/77');
  });
});
