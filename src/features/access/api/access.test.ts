// Tests for the access API functions, run against the dev mock API (`mockServer`): each one reaches its route with the
// body of its assumed contract and reads the answer the way the screens do. The mock keeps simple state, so an action
// can be checked by reading the record again.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import {
  checkIp,
  createIpRule,
  createRole,
  createStaff,
  deleteIpRule,
  deleteRole,
  getIpRule,
  getRole,
  getStaff,
  listIpRules,
  listPermissions,
  listRoles,
  listSessions,
  listStaff,
  reactivateStaff,
  resetStaffTwoFactor,
  revokeSession,
  revokeStaffSessions,
  setAdminRestriction,
  setStaffPassword,
  suspendStaff,
  updateRole,
  updateStaff,
} from '.';

setupMockApi();
// Every test starts signed in as Rami, the Owner (staff id 1, last sign-in from 203.0.113.24).
beforeEach(async () => {
  await signInAs();
});

const RAMI = 1;
const LINA = 2;
const DANA = 4;
const NADIA = 5;
const YUSUF = 6;

describe('staff', () => {
  it('lists the accounts with the role as an object and the open sessions counted', async () => {
    const { data, total } = await listStaff();
    expect(total).toBe(6);
    const rami = data.find((member) => member.id === RAMI);
    expect(rami).toMatchObject({
      name: 'Rami K.',
      role: { id: 1, name: 'Owner' },
      status: 'active',
      activeSessions: 2,
      createdBy: null,
    });
    expect(data.find((member) => member.id === LINA)?.createdBy).toEqual({ id: RAMI, name: 'Rami K.' });
    expect(data.find((member) => member.id === YUSUF)).toMatchObject({
      status: 'suspended',
      suspendedReason: 'Left the team',
    });
  });

  it('pages and filters the list', async () => {
    const page = await listStaff({ start: 0, end: 2, filters: { status: 'active' } });
    expect(page.data).toHaveLength(2);
    expect(page.total).toBe(4);
    expect((await listStaff({ q: 'nadia' })).data.map((member) => member.id)).toEqual([NADIA]);
  });

  it('reads one account, and answers 404 for one that does not exist', async () => {
    expect(await getStaff(LINA)).toMatchObject({ name: 'Lina S.', email: 'lina@gsm-supply.example' });
    await expect(getStaff(999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('adds an admin by invitation: invited, with a link sent and no password in the answer', async () => {
    const created = await createStaff({
      name: 'New Admin',
      email: 'New.Admin@gsm-supply.example',
      roleId: 4,
      onboarding: 'invite',
    });
    expect(created).toMatchObject({
      name: 'New Admin',
      email: 'new.admin@gsm-supply.example',
      status: 'invited',
      role: { id: 4, name: 'Support' },
      createdBy: { id: RAMI, name: 'Rami K.' },
    });
    expect(created.temporaryPassword).toBeUndefined();
    expect(created.resetSentAt).toBeTruthy();
    expect((await listStaff()).total).toBe(7);
  });

  it('adds an admin with a temporary password, returned once', async () => {
    const created = await createStaff({
      name: 'Temp Admin',
      email: 'temp@gsm-supply.example',
      roleId: 4,
      onboarding: 'temporary_password',
    });
    expect(created.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect(created.mustChangePassword).toBe(true);
    expect('temporaryPassword' in (await getStaff(created.id))).toBe(false);
  });

  it('refuses an email that is already an admin, and bad input, as problems', async () => {
    await expect(
      createStaff({ name: 'Copy', email: 'LINA@gsm-supply.example', roleId: 4, onboarding: 'invite' }),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
    await expect(
      createStaff({ name: 'X', email: 'nope', roleId: 99, onboarding: 'invite' }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: expect.any(Array), email: expect.any(Array), roleId: expect.any(Array) },
    });
  });

  it('edits only the fields it is given', async () => {
    const updated = await updateStaff(LINA, { roleId: 3 });
    expect(updated).toMatchObject({ name: 'Lina S.', role: { id: 3, name: 'Finance' } });
    expect(await updateStaff(LINA, { name: 'Lina Saleh' })).toMatchObject({ name: 'Lina Saleh' });
    await expect(updateStaff(LINA, { email: 'omar@gsm-supply.example' })).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
  });

  it('replaces a password by link or by a temporary one, and can end the sessions', async () => {
    expect(await setStaffPassword(LINA, { mode: 'reset_link', revokeSessions: false })).toEqual({});
    expect((await getStaff(LINA)).activeSessions).toBe(1);
    const result = await setStaffPassword(LINA, { mode: 'temporary_password', revokeSessions: true });
    expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect(await getStaff(LINA)).toMatchObject({ mustChangePassword: true, activeSessions: 0 });
  });

  it('signs an admin out everywhere', async () => {
    await revokeStaffSessions(RAMI);
    expect((await getStaff(RAMI)).activeSessions).toBe(0);
  });

  it('suspends with a reason and reactivates', async () => {
    await suspendStaff(LINA, { reason: 'On leave: back in March' });
    expect(await getStaff(LINA)).toMatchObject({
      status: 'suspended',
      suspendedReason: 'On leave: back in March',
      suspendedBy: { id: RAMI, name: 'Rami K.' },
      activeSessions: 0,
    });
    await reactivateStaff(LINA);
    expect(await getStaff(LINA)).toMatchObject({ status: 'active', suspendedReason: null });
    // Never signed in before the suspension: reactivated back to invited.
    await suspendStaff(NADIA, { reason: 'Other' });
    await reactivateStaff(NADIA);
    expect((await getStaff(NADIA)).status).toBe('invited');
  });

  it('refuses to suspend yourself, the last Owner, or someone already suspended', async () => {
    await expect(suspendStaff(RAMI, { reason: 'Other' })).rejects.toMatchObject({
      status: 409,
      code: 'CANNOT_SUSPEND_SELF',
      detail: 'You cannot suspend yourself.',
    });
    await expect(suspendStaff(YUSUF, { reason: 'Other' })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_SUSPENDED',
    });
    await signInAs('dana@gsm-supply.example');
    await expect(suspendStaff(RAMI, { reason: 'Other' })).rejects.toMatchObject({
      status: 409,
      code: 'LAST_OWNER',
    });
    await expect(suspendStaff(DANA, { reason: '' })).rejects.toMatchObject({ status: 422 });
  });

  it('resets 2FA', async () => {
    await resetStaffTwoFactor(LINA);
    expect(await getStaff(LINA)).toMatchObject({ twofaEnabled: false, activeSessions: 0 });
  });
});

describe('IP rules', () => {
  it('lists allowed and blocked rules separately, newest first when asked', async () => {
    const allow = await listIpRules({ filters: { kind: 'allow' }, sort: ['createdAt'], order: ['desc'] });
    expect(allow.total).toBe(3);
    expect(allow.data.every((rule) => rule.kind === 'allow' && rule.scope === 'admin')).toBe(true);
    expect(allow.data[0].createdAt >= allow.data[2].createdAt).toBe(true);
    const block = await listIpRules({ filters: { kind: 'block' } });
    expect(block.total).toBe(4);
    expect(block.data.find((rule) => rule.cidr === '192.0.2.0/24')).toMatchObject({
      scope: 'store',
      source: 'auto',
      createdBy: null,
    });
    expect(block.data.find((rule) => rule.cidr === '203.0.113.160/28')?.createdBy).toEqual({
      id: RAMI,
      name: 'Rami K.',
    });
  });

  it('reads one rule', async () => {
    expect(await getIpRule(1)).toMatchObject({ kind: 'allow', cidr: '203.0.113.24' });
    await expect(getIpRule(999)).rejects.toMatchObject({ status: 404 });
  });

  it('adds an allowed address for the console and a block with a reason and an end time', async () => {
    const allowed = await createIpRule({
      kind: 'allow',
      scope: 'admin',
      cidr: '198.51.100.10',
      label: 'Home',
    });
    expect(allowed).toMatchObject({ kind: 'allow', scope: 'admin', label: 'Home', createdBy: { id: RAMI } });
    const until = new Date(Date.now() + 86_400_000).toISOString();
    const blocked = await createIpRule({
      kind: 'block',
      scope: 'api',
      cidr: '198.51.100.64/28',
      reason: 'Scraping',
      expiresAt: until,
    });
    expect(blocked).toMatchObject({
      kind: 'block',
      scope: 'api',
      reason: 'Scraping',
      expiresAt: until,
      hitCount: 0,
    });
    expect((await listIpRules({ filters: { kind: 'block' } })).total).toBe(5);
  });

  it('rejects an address it cannot read', async () => {
    await expect(createIpRule({ kind: 'block', scope: 'store', cidr: 'nope' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { cidr: [expect.any(String)] },
    });
  });

  it('removes a rule', async () => {
    await deleteIpRule(7);
    await expect(getIpRule(7)).rejects.toMatchObject({ status: 404 });
    await expect(deleteIpRule(7)).rejects.toMatchObject({ status: 404 });
  });

  it('checks an address: a block wins, then the allowed list while the console is restricted', async () => {
    expect(await checkIp({ ip: '192.0.2.5', scope: 'store' })).toMatchObject({
      decision: 'refused',
      rule: { id: 4, kind: 'block' },
    });
    // The same address on the console: that block is for the storefront, and the address is not on the allowed list.
    expect(await checkIp({ ip: '192.0.2.5', scope: 'admin' })).toEqual({ decision: 'refused', rule: null });
    expect(await checkIp({ ip: '203.0.113.24', scope: 'admin' })).toMatchObject({
      decision: 'allowed',
      rule: { id: 1, kind: 'allow' },
    });
    expect(await checkIp({ ip: '8.8.8.8', scope: 'store' })).toEqual({ decision: 'allowed', rule: null });
    await expect(checkIp({ ip: 'nope', scope: 'admin' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { ip: [expect.any(String)] },
    });
  });

  it('turns the restriction off and on, and refuses to lock the caller out', async () => {
    expect(await setAdminRestriction({ enabled: false })).toEqual({ enabled: false });
    expect(await checkIp({ ip: '8.8.8.8', scope: 'admin' })).toEqual({ decision: 'allowed', rule: null });
    expect(await setAdminRestriction({ enabled: true })).toEqual({ enabled: true });

    // Rami signs in from 203.0.113.24, which only the first rule covers.
    await setAdminRestriction({ enabled: false });
    await deleteIpRule(1);
    await expect(setAdminRestriction({ enabled: true })).rejects.toMatchObject({
      status: 409,
      code: 'IP_NOT_IN_ALLOWLIST',
    });
  });
});

describe('roles and permissions', () => {
  it('lists the roles with their permissions and how many admins hold each', async () => {
    const { data, total } = await listRoles();
    expect(total).toBe(6);
    expect(data.find((role) => role.name === 'Owner')).toMatchObject({ permissions: ['*'], staffCount: 1 });
    expect(data.find((role) => role.name === 'Support')?.permissions).toContain('support:*');
    expect(await getRole(4)).toMatchObject({ name: 'Support' });
  });

  it('creates, edits and deletes a role', async () => {
    const created = await createRole({ name: 'Auditor', permissions: ['audit:read'] });
    expect(created).toMatchObject({ name: 'Auditor', permissions: ['audit:read'], staffCount: 0 });
    const updated = await updateRole(created.id, { permissions: ['audit:read', 'staff:read'] });
    expect(updated.permissions).toEqual(['audit:read', 'staff:read']);
    expect(updated.name).toBe('Auditor');
    await deleteRole(created.id);
    await expect(getRole(created.id)).rejects.toMatchObject({ status: 404 });
    await expect(createRole({ name: ' ', permissions: [] })).rejects.toMatchObject({ status: 422 });
  });

  it('refuses to delete a role that admins still hold', async () => {
    await expect(deleteRole(4)).rejects.toMatchObject({ status: 409, code: 'ROLE_IN_USE' });
  });

  it('lists every permission, normalised with its group', async () => {
    const permissions = await listPermissions();
    expect(permissions.length).toBeGreaterThan(100);
    expect(permissions).toContainEqual({ key: 'staff:suspend', label: 'Suspend', group: 'staff' });
    expect(permissions).toContainEqual({
      key: 'wallet:credit_limit',
      label: 'Credit limit',
      group: 'wallet',
    });
  });
});

describe('sessions', () => {
  it('lists staff and merchant sessions and marks the caller’s own', async () => {
    const { data, total } = await listSessions();
    expect(total).toBe(7);
    expect(data.filter((session) => session.subjectType === 'client')).toHaveLength(3);
    const current = data.filter((session) => session.current);
    expect(current).toHaveLength(1);
    expect(current[0].subject.id).toBe(RAMI);
    expect(data[0]).toEqual(
      expect.objectContaining({
        ip: expect.any(String),
        userAgent: expect.any(String),
        subject: expect.any(Object),
      }),
    );
  });

  it('filters by who it belongs to and pages', async () => {
    const merchants = await listSessions({ filters: { subjectType: 'client' } });
    expect(merchants.total).toBe(3);
    const page = await listSessions({ start: 0, end: 5 });
    expect(page.data).toHaveLength(5);
    expect(page.total).toBe(7);
  });

  it('ends one session, which also lowers the admin’s count', async () => {
    const { data } = await listSessions({ filters: { subjectType: 'staff' } });
    const ramis = data.filter((session) => session.subject.id === RAMI);
    await revokeSession(ramis[0].id);
    expect((await listSessions()).total).toBe(6);
    expect((await getStaff(RAMI)).activeSessions).toBe(1);
    await expect(revokeSession(ramis[0].id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('without a session', () => {
  it('answers 401 like the real API', async () => {
    const { apiPost } = await import('@/lib/api');
    await apiPost('/admin/auth/logout');
    await expect(listStaff()).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
});
