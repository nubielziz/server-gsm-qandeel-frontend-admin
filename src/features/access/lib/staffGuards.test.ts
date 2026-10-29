// Tests for the admin account hints (ports of the refusals in suspendAdmin and updateAdmin).
import { describe, expect, it } from 'vitest';
import { activeOwnerCount, isOwner, KEEP_ONE_OWNER, roleChangeGuard, suspendGuard } from './staffGuards';
import { member, role } from '@/test/fixtures/accessRows';

const owner = member({ id: 1, name: 'Rami', role: { id: 1, name: 'Owner' } });
const second = member({ id: 2, name: 'Sam', role: { id: 1, name: 'Owner' } });
const support = member({ id: 3, name: 'Lina', role: { id: 4, name: 'Support' } });

describe('isOwner', () => {
  it('is true for the role called Owner, whatever the case', () => {
    expect(isOwner(member({ role: { id: 9, name: ' owner ' } }))).toBe(true);
    expect(isOwner(support)).toBe(false);
  });

  it('is true for any role that holds the wildcard permission', () => {
    const root = role({ id: 7, name: 'Root', permissions: ['*'] });
    const limited = role({ id: 4, name: 'Support', permissions: ['support:read'] });
    expect(isOwner(member({ role: { id: 7, name: 'Root' } }), [root, limited])).toBe(true);
    expect(isOwner(support, [root, limited])).toBe(false);
  });
});

describe('activeOwnerCount', () => {
  it('counts only owners who can sign in', () => {
    expect(activeOwnerCount([owner, second, support])).toBe(2);
    expect(activeOwnerCount([owner, { ...second, status: 'suspended' }, support])).toBe(1);
    expect(activeOwnerCount([owner, { ...second, status: 'invited' }])).toBe(1);
  });
});

describe('suspendGuard', () => {
  const staff = [owner, support];

  it('refuses yourself', () => {
    expect(suspendGuard({ target: owner, meId: 1, staff })).toEqual({
      ok: false,
      reason: 'You cannot suspend yourself.',
    });
  });

  it('refuses the last active Owner', () => {
    expect(suspendGuard({ target: owner, meId: 3, staff })).toEqual({ ok: false, reason: KEEP_ONE_OWNER });
  });

  it('allows an Owner when another one is active, and any other admin', () => {
    expect(suspendGuard({ target: owner, meId: 3, staff: [owner, second, support] }).ok).toBe(true);
    expect(suspendGuard({ target: support, meId: 1, staff }).ok).toBe(true);
  });

  it('says so when the account is already suspended', () => {
    const gone = { ...support, status: 'suspended' as const };
    expect(suspendGuard({ target: gone, meId: 1, staff: [owner, gone] })).toEqual({
      ok: false,
      reason: 'This account is already suspended.',
    });
  });
});

describe('roleChangeGuard', () => {
  it('refuses your own role', () => {
    expect(roleChangeGuard({ target: support, meId: 3, staff: [owner, support] })).toEqual({
      ok: false,
      reason: 'You cannot change your own role. Ask another Owner.',
    });
  });

  it('refuses the role of the last active Owner', () => {
    expect(roleChangeGuard({ target: owner, meId: 3, staff: [owner, support] })).toEqual({
      ok: false,
      reason: KEEP_ONE_OWNER,
    });
  });

  it('allows the change when another Owner is active, and for any other admin', () => {
    expect(roleChangeGuard({ target: owner, meId: 3, staff: [owner, second, support] }).ok).toBe(true);
    expect(roleChangeGuard({ target: support, meId: 1, staff: [owner, support] }).ok).toBe(true);
  });
});
