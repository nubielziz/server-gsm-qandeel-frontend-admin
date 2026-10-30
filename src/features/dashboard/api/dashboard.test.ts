// Tests for the dashboard API functions, run against the dev mock API: the query each one builds, the answer it reads, how a
// refusal reaches the caller, and the queue monitor link. Nothing here fetches `/admin/queues`: it is a web page.
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, apiPost } from '@/lib/api';
import { resetSession } from '@/mocks/session';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { answerDashboard, answerTopClients, refuse } from '../test/answers';
import { dashboardFixture } from '../test/fixtures';
import { getDashboard, getTopClients, queuesBoardUrl } from '.';

setupMockApi();
// Every test starts signed in as Rami, the Owner.
beforeEach(async () => {
  await signInAs();
});

describe('getDashboard', () => {
  it('asks for the channel and the period', async () => {
    const seen = answerDashboard(dashboardFixture());
    await getDashboard({ scope: 'b2c', days: 14 });
    expect(seen).toHaveLength(1);
    expect(seen[0].pathname).toBe('/admin/dashboard');
    expect(Object.fromEntries(seen[0].searchParams)).toEqual({ scope: 'b2c', days: '14' });
  });

  it('returns the payload as the server sent it', async () => {
    answerDashboard(dashboardFixture());
    const dashboard = await getDashboard({ scope: 'all', days: 7 });
    expect(dashboard.navCounts.orders).toEqual({ open: 12, pastSla: 3 });
    expect(dashboard.stats.current.revenue).toBe('1500.0000');
    expect(dashboard.attention.map((item) => item.kind)).toEqual([
      'orders_past_sla',
      'supplier_down',
      'orders_review',
    ]);
  });

  it('cancels the request when the caller aborts', async () => {
    answerDashboard(dashboardFixture());
    const controller = new AbortController();
    const pending = getDashboard({ scope: 'all', days: 7 }, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('turns a refusal into an ApiError with the server’s words', async () => {
    answerDashboard(refuse(403, 'FORBIDDEN', 'No access', 'You may not read the dashboard.'));
    const error = await getDashboard({ scope: 'all', days: 7 }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      detail: 'You may not read the dashboard.',
    });
  });
});

describe('the dev mock of GET /admin/dashboard', () => {
  it('sends only the sections the channel uses', async () => {
    const all = await getDashboard({ scope: 'all', days: 7 });
    expect(all.revenueByChannel).not.toBeNull();
    expect(all.storefront).not.toBeNull();
    expect(all.topCustomers).not.toBeNull();
    expect(all.ordersByType.monthly).toHaveLength(12);

    const merchants = await getDashboard({ scope: 'b2b', days: 7 });
    expect(merchants.revenueByChannel).toBeNull();
    expect(merchants.storefront).toBeNull();
    expect(merchants.topCustomers).toBeNull();
    expect(merchants.ordersByType.monthly).toHaveLength(12);

    const storefront = await getDashboard({ scope: 'b2c', days: 7 });
    expect(storefront.revenueByChannel).toBeNull();
    expect(storefront.storefront).not.toBeNull();
    expect(storefront.ordersByType.monthly).toBeNull();
  });

  it('counts the queue and the sidebar from the same orders', async () => {
    const dashboard = await getDashboard({ scope: 'all', days: 7 });
    const waiting = dashboard.queues.reduce((total, queue) => total + queue.open, 0);
    // The Orders page counts 48 open orders in the seed; the dashboard must agree.
    expect(dashboard.navCounts.orders.open).toBe(48);
    expect(waiting).toBe(48);
    const late = dashboard.queues.reduce((total, queue) => total + queue.pastSla, 0);
    expect(dashboard.navCounts.orders.pastSla).toBe(late);
    const item = dashboard.attention.find((entry) => entry.kind === 'orders_past_sla');
    expect(item).toMatchObject({ count: late });
    expect(dashboard.navCounts.risk.held).toBe(4);
  });

  it('splits the queue by channel and ranks the attention list by severity', async () => {
    const all = await getDashboard({ scope: 'all', days: 7 });
    const merchants = await getDashboard({ scope: 'b2b', days: 7 });
    const storefront = await getDashboard({ scope: 'b2c', days: 7 });
    const open = (queues: typeof all.queues) => queues.reduce((total, queue) => total + queue.open, 0);
    expect(open(merchants.queues) + open(storefront.queues)).toBe(open(all.queues));

    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    const ranks = all.attention.map((item) => order[item.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(merchants.attention.map((item) => item.kind)).toContain('deposits_pending');
    expect(merchants.attention.map((item) => item.kind)).not.toContain('orders_held');
    expect(storefront.attention.map((item) => item.kind)).toContain('orders_held');
    expect(storefront.attention.map((item) => item.kind)).not.toContain('deposits_pending');
  });

  it('refuses a value outside the choices the way the server does', async () => {
    const error = await getDashboard({ scope: 'everyone' as 'all', days: 7 }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    const days = await getDashboard({ scope: 'all', days: 30 as 7 }).catch((caught: unknown) => caught);
    expect(days).toMatchObject({ status: 422 });
  });
});

describe('the dev mock and the session', () => {
  it('refuses a call with no session with 401, like the real server', async () => {
    resetSession();
    const error = await getDashboard({ scope: 'all', days: 7 }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    const topError = await getTopClients({ days: 7, limit: 6 }).catch((caught: unknown) => caught);
    expect(topError).toMatchObject({ status: 401 });
  });

  it('refuses a half-signed-in session (password given, code not yet) with 401', async () => {
    resetSession();
    await apiPost('/admin/auth/login', { email: 'rami@gsm-supply.example', password: 'demo-password' });
    const error = await getDashboard({ scope: 'all', days: 7 }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
});

describe('getTopClients', () => {
  it('asks for the period and the number of merchants', async () => {
    const seen = answerTopClients([]);
    await getTopClients({ days: 14, limit: 6 });
    expect(seen[0].pathname).toBe('/admin/reports/top-clients');
    expect(Object.fromEntries(seen[0].searchParams)).toEqual({ days: '14', limit: '6' });
  });

  it('returns the merchants of the mock, best spend first, with their wallets', async () => {
    const clients = await getTopClients({ days: 7, limit: 6 });
    expect(clients).toHaveLength(6);
    const spends = clients.map((client) => Number(client.spend));
    expect(spends).toEqual([...spends].sort((a, b) => b - a));
    expect(clients[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        walletBalance: expect.any(String),
      }),
    );
    expect(await getTopClients({ days: 7, limit: 2 })).toHaveLength(2);
  });
});

describe('queuesBoardUrl', () => {
  it('is the address of the queue monitor on the API, not a request', () => {
    expect(queuesBoardUrl()).toBe('http://api.test/admin/queues');
  });
});
