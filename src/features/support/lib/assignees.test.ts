// Tests for the options of the Assignee select.
import { describe, expect, it } from 'vitest';
import { assigneeOptions } from './assignees';

const staff = [
  { id: 1, name: 'Rami K.', status: 'active' },
  { id: 2, name: 'Lina S.', status: 'active' },
  { id: 5, name: 'Nadia H.', status: 'suspended' },
];

describe('assigneeOptions', () => {
  it('starts with Unassigned, lists the staff and marks the signed-in member', () => {
    expect(assigneeOptions(staff, { id: 1, name: 'Rami K.' }, null)).toEqual([
      { value: '', label: 'Unassigned' },
      { value: '1', label: 'Rami K. (you)' },
      { value: '2', label: 'Lina S.' },
    ]);
  });

  it('keeps a suspended member who still holds the ticket, so the select can show them', () => {
    const options = assigneeOptions(staff, { id: 1, name: 'Rami K.' }, { id: 5, name: 'Nadia H.' });
    expect(options.map((option) => option.label)).toEqual([
      'Unassigned',
      'Rami K. (you)',
      'Lina S.',
      'Nadia H.',
    ]);
  });

  it('falls back to the signed-in member and the current assignee when the staff list is not readable', () => {
    expect(assigneeOptions([], { id: 9, name: 'Test Operator' }, { id: 2, name: 'Lina S.' })).toEqual([
      { value: '', label: 'Unassigned' },
      { value: '9', label: 'Test Operator (you)' },
      { value: '2', label: 'Lina S.' },
    ]);
  });

  it('works before the signed-in member is known', () => {
    expect(assigneeOptions([], undefined, null)).toEqual([{ value: '', label: 'Unassigned' }]);
  });
});
