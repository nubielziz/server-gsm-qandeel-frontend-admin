// Tests for the plan API functions, run against the dev mock API: the list, create, update and delete, and the server's refusals (a bad
// rate, a plan that agents are still assigned to).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createPlan, deletePlan, getPlan, listPlans, updatePlan } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const NEW_PLAN = {
  name: 'Gold',
  kind: 'referral' as const,
  percent: '4',
  basis: 'Order revenue',
  period: 'monthly',
  tiers: { minPayout: '25' },
  isActive: true,
};

describe('listPlans and getPlan', () => {
  it('lists the plans with their rate, kind and conditions', async () => {
    const requests = recordRequests();
    const page = await listPlans({ sort: ['id'], order: ['asc'] });
    expect(requests.last().url.pathname).toBe('/admin/commission-plans');
    expect(page.total).toBe(3);
    expect(page.data[0]).toMatchObject({
      id: 1,
      name: 'Referral',
      kind: 'referral',
      percent: '3.0000',
      tiers: { minPayout: '50.0000' },
      isActive: true,
    });
    expect(page.data[2]).toMatchObject({ name: 'Volume rebate', kind: 'rebate' });
    expect(await getPlan(2)).toMatchObject({ name: 'Partner', percent: '5.0000' });
    await expect(getPlan(99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createPlan', () => {
  it('posts the plan and gets it back with an id', async () => {
    const requests = recordRequests();
    const plan = await createPlan(NEW_PLAN);
    expect(requests.last()).toMatchObject({ method: 'POST', body: NEW_PLAN });
    expect(plan).toMatchObject({ id: 4, name: 'Gold', percent: '4.0000', tiers: { minPayout: '25' } });
    expect((await listPlans()).total).toBe(4);
  });

  it('refuses a rate outside the server’s range, and a missing name', async () => {
    await expect(createPlan({ ...NEW_PLAN, percent: '40' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { percent: ['Enter a rate between 0.5 and 15.'] },
    });
    await expect(createPlan({ ...NEW_PLAN, name: ' ' })).rejects.toMatchObject({ status: 422 });
  });
});

describe('updatePlan', () => {
  it('patches only the fields it is given', async () => {
    const requests = recordRequests();
    const plan = await updatePlan(1, { percent: '3.5' });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { percent: '3.5' } });
    expect(requests.last().url.pathname).toBe('/admin/commission-plans/1');
    expect(plan).toMatchObject({ name: 'Referral', percent: '3.5000' });
  });

  it('refuses a rate outside the range and a plan that does not exist', async () => {
    await expect(updatePlan(1, { percent: '0.1' })).rejects.toMatchObject({ status: 422 });
    await expect(updatePlan(99, { name: 'x' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('deletePlan', () => {
  it('deletes a plan nobody is on', async () => {
    const requests = recordRequests();
    await deletePlan(3);
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect(requests.last().url.pathname).toBe('/admin/commission-plans/3');
    expect((await listPlans()).total).toBe(2);
  });

  it('is refused (409) for a plan that agents are assigned to, with the server’s message', async () => {
    await expect(deletePlan(1)).rejects.toMatchObject({
      status: 409,
      code: 'PLAN_IN_USE',
      detail: 'The Referral plan is assigned to 1 agent. End or move those assignments first.',
    });
    expect((await listPlans()).total).toBe(3);
  });
});
