// Tests for the group form's rules: what a new group starts with, how a group fills the form, the body of a create (no position, the kind
// of the strip) and the body of a change (only what differs).
import { describe, expect, it } from 'vitest';
import type { ServiceCategory } from '../types';
import { changesOf, createBody, NEW_GROUP, valuesOf } from './groupForm';

const group: ServiceCategory = {
  id: 5,
  name: 'Xiaomi',
  type: 'imei',
  allowedGroupIds: [2, 3],
  sort: 5,
  isActive: true,
  serviceCount: 3,
};

describe('NEW_GROUP and valuesOf', () => {
  it('starts a new group active and visible to every rank', () => {
    expect(NEW_GROUP).toEqual({ name: '', isActive: true, allowedGroupIds: [] });
  });

  it('fills the form from a group, with its own copy of the ranks', () => {
    const values = valuesOf(group);
    expect(values).toEqual({ name: 'Xiaomi', isActive: true, allowedGroupIds: [2, 3] });
    expect(values.allowedGroupIds).not.toBe(group.allowedGroupIds);
  });
});

describe('createBody', () => {
  it('trims the name, takes the kind of the strip and sends no position', () => {
    const body = createBody({ name: '  Bulk credits ', isActive: false, allowedGroupIds: [2] }, 'server');
    expect(body).toEqual({ name: 'Bulk credits', type: 'server', allowedGroupIds: [2], isActive: false });
    expect('sort' in body).toBe(false);
  });
});

describe('changesOf', () => {
  it('is empty when nothing differs, whatever the order of the ranks', () => {
    expect(changesOf({ name: 'Xiaomi', isActive: true, allowedGroupIds: [3, 2] }, group)).toEqual({});
  });

  it('is empty for a name that only differs by spaces around it', () => {
    expect(changesOf({ name: ' Xiaomi ', isActive: true, allowedGroupIds: [2, 3] }, group)).toEqual({});
  });

  it('holds only the keys that differ', () => {
    expect(changesOf({ name: 'Xiaomi Pro', isActive: true, allowedGroupIds: [2, 3] }, group)).toEqual({
      name: 'Xiaomi Pro',
    });
    expect(changesOf({ name: 'Xiaomi', isActive: false, allowedGroupIds: [3] }, group)).toEqual({
      isActive: false,
      allowedGroupIds: [3],
    });
  });

  it('sends an empty list when the ranks are cleared (every rank sees the group)', () => {
    expect(changesOf({ name: 'Xiaomi', isActive: true, allowedGroupIds: [] }, group)).toEqual({
      allowedGroupIds: [],
    });
  });
});
