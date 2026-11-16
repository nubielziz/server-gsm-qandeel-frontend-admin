// Tests for what the pinned-results form sends: the body of a new rule, and only the changed fields of an edit.
import { describe, expect, it } from 'vitest';
import type { SearchPin } from '../types';
import { changedPinFields, createPinBody, type PinFormValues } from './pinForm';
import { toInputValue } from './search';

const pin: SearchPin = {
  id: 1,
  query: 'unlock',
  match: 'contains',
  pinned: [
    { serviceId: 9, position: 2, title: 'EE UK Unlock' },
    { serviceId: 5, position: 1, title: 'AT&T USA Premier Unlock' },
  ],
  hidden: [{ serviceId: 10, title: 'Orange France Unlock' }],
  startsAt: '2030-12-01T09:00:30.000Z',
  endsAt: null,
  isEnabled: true,
  note: 'Holiday push',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-02T09:00:00.000Z',
};

/** The form as the dialog opens it for `pin`. */
function formOf(rule: SearchPin): PinFormValues {
  return {
    query: rule.query,
    match: rule.match,
    pinned: rule.pinned,
    hidden: rule.hidden,
    startsAt: toInputValue(rule.startsAt),
    endsAt: toInputValue(rule.endsAt),
    note: rule.note,
    isEnabled: rule.isEnabled,
  };
}

describe('createPinBody', () => {
  it('cleans the query, keeps the pinned services in the order of the form and drops titles and empty fields', () => {
    expect(createPinBody({ ...formOf(pin), query: '  UNLOCK  Now ', startsAt: '', note: ' ' })).toEqual({
      query: 'unlock now',
      match: 'contains',
      // The form's order, not the position's: a refusal `pinned.<i>` is shown on form row i.
      pinned: [
        { serviceId: 9, position: 2 },
        { serviceId: 5, position: 1 },
      ],
      hidden: [10],
      isEnabled: true,
    });
  });

  it('sends the dates as ISO times and keeps the note', () => {
    const body = createPinBody({ ...formOf(pin), startsAt: '2030-12-01T09:00', endsAt: '2030-12-31T18:00' });
    expect(body.startsAt).toBe(new Date(2030, 11, 1, 9, 0).toISOString());
    expect(body.endsAt).toBe(new Date(2030, 11, 31, 18, 0).toISOString());
    expect(body.note).toBe('Holiday push');
  });
});

describe('changedPinFields', () => {
  it('sends nothing for a form nobody touched, even when a saved time has seconds', () => {
    expect(changedPinFields(formOf(pin), pin)).toEqual({});
  });

  it('sends only the fields that differ', () => {
    expect(changedPinFields({ ...formOf(pin), note: 'Seasonal', isEnabled: false }, pin)).toEqual({
      note: 'Seasonal',
      isEnabled: false,
    });
    expect(changedPinFields({ ...formOf(pin), query: 'Network Unlock' }, pin)).toEqual({
      query: 'network unlock',
    });
  });

  it('sends the whole pinned list when a position changes, and the hidden ids when one is removed', () => {
    const moved = {
      ...formOf(pin),
      pinned: pin.pinned.map((p) => (p.serviceId === 9 ? { ...p, position: 3 } : p)),
    };
    expect(changedPinFields(moved, pin)).toEqual({
      pinned: [
        { serviceId: 9, position: 3 },
        { serviceId: 5, position: 1 },
      ],
    });
    expect(changedPinFields({ ...formOf(pin), hidden: [] }, pin)).toEqual({ hidden: [] });
  });

  it('sends nothing when the same services only sit in another order in the form', () => {
    const reordered = { ...formOf(pin), pinned: [...pin.pinned].reverse() };
    expect(changedPinFields(reordered, pin)).toEqual({});
  });

  it('sends the pinned list in the order of the form, so a refusal lands on the right row', () => {
    const pinned = [
      { serviceId: 5, position: 3, title: 'AT&T USA Premier Unlock' },
      { serviceId: 9, position: 1, title: 'EE UK Unlock' },
    ];
    expect(changedPinFields({ ...formOf(pin), pinned }, pin).pinned).toEqual([
      { serviceId: 5, position: 3 },
      { serviceId: 9, position: 1 },
    ]);
  });

  it('sends null for a date that was cleared', () => {
    expect(changedPinFields({ ...formOf(pin), startsAt: '' }, pin)).toEqual({ startsAt: null });
  });
});
