// Tests for the risk API functions, run against the dev mock API (`mockServer`): each one reaches its route with the body of its
// assumed contract and reads the answer the way the screens do. The mock keeps simple state, so a decision or an edit can be
// checked by reading the queue, the order, the blocklist or the rules again.
import { beforeEach, describe, expect, it } from 'vitest';
import { getOrder } from '@/features/orders';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import {
  approveHeldOrder,
  createBlocklistEntry,
  deleteBlocklistEntry,
  getBlocklistEntry,
  getImeiCheck,
  getRiskQueue,
  getRiskRules,
  listBlocklist,
  listImeiChecks,
  refundHeldOrder,
  saveRiskRules,
} from '.';

setupMockApi();
// Every test starts signed in as Rami, the Owner.
beforeEach(async () => {
  await signInAs();
});

// Held storefront orders of the mock seed (taken from the demo; see src/features/risk/mocks/seed.ts).
const HELD = [20490, 20491, 20494, 20495];
const DECIDED = [20464, 20400];

async function failure(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('The call should have failed.');
}

describe('getRiskQueue', () => {
  it('lists the held orders longest wait first, with the strip’s figures and the latest decisions', async () => {
    const queue = await getRiskQueue();
    expect(queue.held.map((order) => order.orderId)).toEqual(HELD);
    expect(queue.held[0]).toMatchObject({
      score: 67,
      imei: '867412052715306',
      device: 'Redmi Note 12 (23021RAAEG)',
      capturedAmount: '12.9900',
      paymentMethod: 'card',
    });
    expect(queue.held[0].signals).toContain('VPN or proxy IP');
    expect(queue.held[0].customer).toMatchObject({
      name: 'Tyler Brooks',
      country: 'US',
      riskLevel: 'medium',
    });
    expect(queue.stats).toMatchObject({ decided30d: 2, approved30d: 1, refunded30d: 1 });
    expect(queue.recent?.map((order) => order.orderId)).toEqual(DECIDED);
    expect(queue.recent?.[0]).toMatchObject({ outcome: 'refunded', reviewedBy: { name: 'Rami K.' } });
  });
});

describe('approveHeldOrder', () => {
  it('sends the order on to its supplier and takes it out of the queue', async () => {
    await approveHeldOrder(20490);
    const queue = await getRiskQueue();
    expect(queue.held.map((order) => order.orderId)).toEqual([20491, 20494, 20495]);
    expect(queue.recent?.[0]).toMatchObject({ orderId: 20490, outcome: 'approved' });
    expect(await getOrder(20490)).toMatchObject({ status: 'processing', queue: null });
  });

  it('refuses an order nobody is holding and one that does not exist', async () => {
    await approveHeldOrder(20491);
    expect(await failure(approveHeldOrder(20491))).toMatchObject({ status: 409, code: 'NOT_HELD' });
    expect(await failure(approveHeldOrder(999999))).toMatchObject({ status: 404 });
  });
});

describe('refundHeldOrder', () => {
  it('refunds without blocking anyone when no block is asked for', async () => {
    await refundHeldOrder(20494, { reason: 'Looks like card testing' });
    expect((await getRiskQueue()).held.map((order) => order.orderId)).not.toContain(20494);
    expect(await getOrder(20494)).toMatchObject({ status: 'rejected', queue: null });
    expect((await listBlocklist()).total).toBe(5);
  });

  it('adds the customer’s email and the device to the blocklist, with the reason, when asked', async () => {
    await refundHeldOrder(20495, { reason: 'Stolen card', blockEmail: true, blockDevice: true });
    const list = await listBlocklist({ filters: { source: 'manual' } });
    expect(list.total).toBe(5);
    const kinds = (await listBlocklist()).data.filter((entry) => entry.reason === 'Stolen card');
    expect(kinds.map((entry) => entry.kind).sort()).toEqual(['email', 'imei']);
    expect(kinds.find((entry) => entry.kind === 'imei')?.display).toBe('35 460711 919542 2');
    expect(kinds.find((entry) => entry.kind === 'email')?.display).toMatch(/^\w\w\*{4}@/);
  });

  it('writes a reason from the first signal when none is sent', async () => {
    await refundHeldOrder(20490, { blockEmail: true });
    const added = (await listBlocklist()).data.find(
      (entry) => entry.kind === 'email' && entry.source === 'manual' && entry.id > 6,
    );
    expect(added?.reason).toBe('Refunded after risk review: IMEI was checked blacklisted before');
  });

  it('refuses an order that was already decided', async () => {
    await refundHeldOrder(20490, {});
    expect(await failure(refundHeldOrder(20490, {}))).toMatchObject({ status: 409, code: 'NOT_HELD' });
  });
});

describe('IMEI checks', () => {
  it('pages and sorts on the server, newest first, with the total from the header', async () => {
    const page = await listImeiChecks({ start: 0, end: 3, sort: ['createdAt'], order: ['desc'] });
    expect(page.total).toBe(907);
    expect(page.data).toHaveLength(3);
    const times = page.data.map((check) => Date.parse(check.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('filters by check type, result and source, and counts with a one-row call', async () => {
    expect((await listImeiChecks({ start: 0, end: 1, filters: { status: 'blacklisted' } })).total).toBe(29);
    expect((await listImeiChecks({ start: 0, end: 1, filters: { source: 'pre_order' } })).total).toBe(286);
    const icloud = await listImeiChecks({ filters: { checkType: 'icloud' } });
    expect(icloud.total).toBe(148);
    expect(icloud.data.every((check) => check.checkType === 'icloud')).toBe(true);
  });

  it('searches the IMEI, brand and model', async () => {
    const pixel = await listImeiChecks({ q: 'pixel' });
    expect(pixel.total).toBeGreaterThan(0);
    expect(pixel.data.every((check) => /pixel/i.test(`${check.brand} ${check.model}`))).toBe(true);
    const one = (await listImeiChecks({ start: 0, end: 1 })).data[0];
    expect((await listImeiChecks({ q: one.imei })).data.map((check) => check.id)).toContain(one.id);
  });

  it('reads one check, and shows an IMEI the server has hashed as it sends it', async () => {
    const hashed = (await listImeiChecks({ q: 'sha256' })).data;
    expect(hashed).toHaveLength(6);
    expect(hashed[0].imei).toMatch(/^sha256:/);
    const check = await getImeiCheck(hashed[0].id);
    expect(check).toMatchObject({ id: hashed[0].id, imei: hashed[0].imei });
    expect(await failure(getImeiCheck(1))).toMatchObject({ status: 404 });
  });
});

describe('blocklist', () => {
  it('lists the entries, filters by kind and reads one', async () => {
    const all = await listBlocklist({ sort: ['createdAt'], order: ['desc'] });
    expect(all.total).toBe(5);
    expect(all.data[0].kind).toBe('imei');
    const emails = await listBlocklist({ filters: { kind: 'email' } });
    expect(emails.data.map((entry) => entry.display)).toEqual(['jt.****@tempbox.example']);
    expect(emails.data[0]).toMatchObject({ source: 'chargeback', createdBy: null });
    expect(await getBlocklistEntry(3)).toMatchObject({ kind: 'domain', createdBy: { name: 'Rami K.' } });
  });

  it('adds an entry; an IMEI is formatted by the server', async () => {
    const added = await createBlocklistEntry({ kind: 'imei', value: '353890118842014', reason: 'Stolen' });
    expect(added).toMatchObject({ kind: 'imei', display: '35 389011 884201 4', source: 'manual' });
    expect(added.createdBy?.name).toBe('Rami K.');
    expect((await listBlocklist()).total).toBe(6);
  });

  it('refuses a duplicate, a bad IMEI and a missing reason with the field named', async () => {
    const duplicate = await failure(
      createBlocklistEntry({ kind: 'domain', value: 'tempbox.example', reason: 'Again' }),
    );
    expect(duplicate).toMatchObject({ status: 409, code: 'ALREADY_BLOCKED' });
    const bad = await failure(createBlocklistEntry({ kind: 'imei', value: '123', reason: '' }));
    expect(bad.status).toBe(422);
    expect(bad.fieldErrors).toEqual({
      value: ['An IMEI has 15 digits.'],
      reason: ['Add a short reason so the next person knows why.'],
    });
  });

  it('removes an entry, and says so when it is gone', async () => {
    await deleteBlocklistEntry(3);
    expect((await listBlocklist()).data.map((entry) => entry.id)).not.toContain(3);
    expect(await failure(deleteBlocklistEntry(3))).toMatchObject({ status: 404 });
  });
});

describe('risk rules', () => {
  it('reads the rules with the hold line below the block line', async () => {
    const { rules } = await getRiskRules();
    expect(rules).toHaveLength(8);
    expect(rules.find((rule) => rule.id === 'reviewThreshold')).toEqual({
      id: 'reviewThreshold',
      on: true,
      value: 50,
    });
    expect(rules.find((rule) => rule.id === 'blockDisposableEmail')?.on).toBe(false);
  });

  it('saves the whole set and answers with it', async () => {
    const { rules } = await getRiskRules();
    const body = {
      rules: rules.map((rule) => (rule.id === 'reviewThreshold' ? { ...rule, value: 60 } : rule)),
    };
    const saved = await saveRiskRules(body);
    expect(saved.rules.find((rule) => rule.id === 'reviewThreshold')?.value).toBe(60);
    expect((await getRiskRules()).rules.find((rule) => rule.id === 'reviewThreshold')?.value).toBe(60);
  });

  it('refuses a hold line that is not below the block line, with the message on its field', async () => {
    const { rules } = await getRiskRules();
    const body = {
      rules: rules.map((rule) => (rule.id === 'reviewThreshold' ? { ...rule, value: 90 } : rule)),
    };
    const error = await failure(saveRiskRules(body));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.reviewThreshold).toEqual([
      'The review threshold must be lower than the block threshold.',
    ]);
    expect((await getRiskRules()).rules.find((rule) => rule.id === 'reviewThreshold')?.value).toBe(50);
  });
});
