// Tests for the admin dialog input helpers (cleaning, the email check, which fields of an edit changed).
import { describe, expect, it } from 'vitest';
import { changedFields, cleanEmail, cleanName, defaultRoleId, suspendReason, validEmail } from './staffInput';
import { member, role } from '@/test/fixtures/accessRows';

describe('cleaning', () => {
  it('tidies a name and lower-cases an email', () => {
    expect(cleanName('  Lina    S. ')).toBe('Lina S.');
    expect(cleanEmail('  Lina@GSM-Supply.Example ')).toBe('lina@gsm-supply.example');
  });

  it('checks the shape of an email only', () => {
    expect(validEmail('lina@gsm-supply.example')).toBe(true);
    expect(validEmail(' lina@gsm-supply.example ')).toBe(true);
    expect(validEmail('lina@gsm')).toBe(false);
    expect(validEmail('lina gsm@x.io')).toBe(false);
    expect(validEmail('')).toBe(false);
  });
});

describe('defaultRoleId', () => {
  it('starts on the Support role when there is one, and on no role otherwise', () => {
    const roles = [role({ id: 1, name: 'Owner' }), role({ id: 4, name: ' support ', permissions: [] })];
    expect(defaultRoleId(roles)).toBe('4');
    expect(defaultRoleId([roles[0]])).toBe('');
    expect(defaultRoleId([])).toBe('');
  });
});

describe('suspendReason', () => {
  it('puts the note after the reason, separated by a colon', () => {
    expect(suspendReason('On leave', '')).toBe('On leave');
    expect(suspendReason('On leave', '  back in March ')).toBe('On leave: back in March');
  });
});

describe('changedFields', () => {
  const lina = member({
    name: 'Lina S.',
    email: 'lina@gsm-supply.example',
    role: { id: 4, name: 'Support' },
  });
  const same = { name: 'Lina S.', email: 'lina@gsm-supply.example', roleId: '4' };

  it('is empty when nothing changed, even if spaces and case differ', () => {
    expect(changedFields(lina, same, true)).toEqual({});
    expect(
      changedFields(lina, { ...same, name: ' Lina   S. ', email: 'LINA@gsm-supply.example' }, true),
    ).toEqual({});
  });

  it('lists the changed fields in the demo order: role, name, email', () => {
    const body = changedFields(
      lina,
      { name: 'Lina Saleh', email: 'new@gsm-supply.example', roleId: '2' },
      true,
    );
    expect(Object.keys(body)).toEqual(['roleId', 'name', 'email']);
    expect(body).toEqual({ roleId: 2, name: 'Lina Saleh', email: 'new@gsm-supply.example' });
  });

  it('ignores the role when it is locked', () => {
    expect(changedFields(lina, { ...same, roleId: '2' }, false)).toEqual({});
  });
});
