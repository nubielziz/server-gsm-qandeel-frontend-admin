// Tests for the assignment API functions, run against the dev mock API: the agents with their joins, assigning a plan, moving an agent
// to another plan, ending an assignment, and the server's refusals.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createAssignment, deleteAssignment, getAssignment, listAssignments, updateAssignment } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

describe('listAssignments and getAssignment', () => {
  it('lists the agents with the merchant and the plan joined', async () => {
    const requests = recordRequests();
    const page = await listAssignments({ sort: ['createdAt'], order: ['desc'] });
    expect(requests.last().url.pathname).toBe('/admin/commission-assignments');
    expect(page.total).toBe(2);
    const zain = page.data.find((assignment) => assignment.beneficiaryId === 1);
    expect(zain).toMatchObject({
      beneficiary: { id: 1, name: 'Zain Mobile Hub', country: 'JO' },
      plan: { id: 1, name: 'Referral', percent: '3.0000' },
      scope: 'referrals',
      endsAt: null,
    });
    expect(await getAssignment(2)).toMatchObject({ beneficiary: { name: 'Cairo GSM Lab' } });
    await expect(getAssignment(99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createAssignment', () => {
  it('posts the merchant and the plan and gets the new assignment', async () => {
    const requests = recordRequests();
    const assignment = await createAssignment({ beneficiaryId: 8, planId: 2 });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { beneficiaryId: 8, planId: 2 } });
    expect(assignment).toMatchObject({
      beneficiary: { name: 'Casablanca Unlock' },
      plan: { name: 'Partner' },
      endsAt: null,
    });
    expect((await listAssignments()).total).toBe(3);
  });

  it('refuses a merchant that already has a plan (409) and ids that do not exist (422)', async () => {
    await expect(createAssignment({ beneficiaryId: 1, planId: 2 })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_ASSIGNED',
      detail: 'Zain Mobile Hub is already on the Referral plan. Change its plan instead.',
    });
    await expect(createAssignment({ beneficiaryId: 999, planId: 99 })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { beneficiaryId: expect.any(Array), planId: expect.any(Array) },
    });
  });
});

describe('updateAssignment and deleteAssignment', () => {
  it('moves an agent to another plan', async () => {
    const requests = recordRequests();
    const assignment = await updateAssignment(1, { planId: 2 });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { planId: 2 } });
    expect(requests.last().url.pathname).toBe('/admin/commission-assignments/1');
    expect(assignment.plan).toMatchObject({ id: 2, name: 'Partner' });
    await expect(updateAssignment(1, { planId: 99 })).rejects.toMatchObject({ status: 422 });
  });

  it('ends an assignment, and the plan can then be deleted', async () => {
    const requests = recordRequests();
    await deleteAssignment(1);
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect((await listAssignments()).total).toBe(1);
    await expect(deleteAssignment(1)).rejects.toMatchObject({ status: 404 });
  });
});
