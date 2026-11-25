// Tests for the group form's rules: what a new group starts with, how a group fills the form, the body of a create (no position, the kind
// of the strip) and the body of a change (only what differs).
import { describe, expect, it } from 'vitest';
import type { ServiceCategory } from '../types';
import { ApiError } from '@/lib/api';
import { changesOf, createBody, duplicateNameText, groupFormError, NEW_GROUP, valuesOf } from './groupForm';

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

describe('groupFormError', () => {
  /** A 422 as the server sends it: one entry per message, each with its code when it has one. */
  const refusal = (fields: Record<string, string[]>, codes: Record<string, string[]> = {}) =>
    new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      title: 'Check the form',
      detail: 'Some fields need attention.',
      fieldErrors: fields,
      fieldCodes: codes,
      formErrors: ['A general message.'],
      requestId: 'req-1',
    });

  it('says a taken name in groups and in the kind as the strip shows it', () => {
    const error = refusal(
      { name: ['A file category with this name already exists.'] },
      { name: ['duplicate'] },
    );
    const mapped = groupFormError(error, 'file') as ApiError;
    expect(mapped.fieldErrors.name).toEqual(['A group with this name already exists in File Service.']);
    expect(duplicateNameText('server')).toBe('A group with this name already exists in Server Service.');
  });

  it('keeps everything else of the error, and leaves the original as it was', () => {
    const error = refusal(
      { name: ['A file category with this name already exists.'], allowedGroupIds: ['Group 9 is closed.'] },
      { name: ['duplicate'], allowedGroupIds: ['invalid'] },
    );
    const mapped = groupFormError(error, 'imei') as ApiError;
    expect(mapped).toBeInstanceOf(ApiError);
    expect(mapped.fieldErrors.allowedGroupIds).toEqual(['Group 9 is closed.']);
    expect(mapped.formErrors).toEqual(['A general message.']);
    expect([mapped.status, mapped.code, mapped.detail, mapped.requestId]).toEqual([
      422,
      'VALIDATION_FAILED',
      'Some fields need attention.',
      'req-1',
    ]);
    expect(error.fieldErrors.name).toEqual(['A file category with this name already exists.']);
  });

  it('changes only the message that has the code when the name has several', () => {
    const mapped = groupFormError(
      refusal({ name: ['Too long.', 'Taken.'] }, { name: ['too_long', 'duplicate'] }),
      'remote',
    ) as ApiError;
    expect(mapped.fieldErrors.name).toEqual([
      'Too long.',
      'A group with this name already exists in Remote Service.',
    ]);
  });

  it('leaves another message on the name, a message with no code, and a code on another field as the server sent them', () => {
    const other = refusal({ name: ['Too long.'] }, { name: ['too_long'] });
    expect(groupFormError(other, 'imei')).toBe(other);
    const noCode = refusal({ name: ['An IMEI category with this name already exists.'] });
    expect(groupFormError(noCode, 'imei')).toBe(noCode);
    const elsewhere = refusal({ sort: ['Taken.'] }, { sort: ['duplicate'] });
    expect(groupFormError(elsewhere, 'imei')).toBe(elsewhere);
    // The codes cannot be matched to the messages when one entry has none.
    const unmatched = refusal({ name: ['One.', 'Two.'] }, { name: ['duplicate'] });
    expect(groupFormError(unmatched, 'imei')).toBe(unmatched);
  });

  it('passes anything that is not an API error through', () => {
    const failure = new Error('offline');
    expect(groupFormError(failure, 'imei')).toBe(failure);
    expect(groupFormError('x', 'imei')).toBe('x');
  });
});
