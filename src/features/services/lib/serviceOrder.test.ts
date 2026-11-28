// Tests for when the rows of the Pricing view can be dragged (decision 038): only the services of one chosen group that the page holds in full,
// never while a search or typed positions are on, the page before is kept on screen or the role cannot change the order. A save that runs
// does not turn dragging off (decision 042).
import { describe, expect, it } from 'vitest';
import { serviceDragState, type ServiceDragInput } from './serviceOrder';

const ready: ServiceDragInput = {
  lock: { disabled: false },
  typedPositions: 0,
  q: '',
  group: 4,
  page: 1,
  rows: 6,
  total: 6,
  stale: false,
};

describe('serviceDragState', () => {
  it('is on for the whole of one chosen group on the first page', () => {
    expect(serviceDragState(ready)).toEqual({ on: true });
  });

  it('is off without the permission, with the lock the grants give and a line in the view', () => {
    expect(
      serviceDragState({
        ...ready,
        lock: { disabled: true, title: 'You need the catalog:update permission' },
      }),
    ).toEqual({
      on: false,
      reason: 'You need the catalog:update permission',
      hint: true,
    });
    expect(serviceDragState({ ...ready, lock: { disabled: true } })).toMatchObject({
      on: false,
      reason: 'You cannot change the order',
    });
  });

  it('is off, with a line, while positions are typed and not saved', () => {
    expect(serviceDragState({ ...ready, typedPositions: 2 })).toEqual({
      on: false,
      reason: 'Save or clear the typed positions first',
      hint: true,
    });
  });

  it('is off, with a line, while a search is on', () => {
    expect(serviceDragState({ ...ready, q: 'unlock' })).toEqual({
      on: false,
      reason: 'Clear the search to drag services',
      hint: true,
    });
  });

  it('is off, with a line, while no group is chosen (the rows of several groups are one flat list)', () => {
    expect(serviceDragState({ ...ready, group: undefined })).toEqual({
      on: false,
      reason: 'Choose a group to drag its services',
      hint: true,
    });
  });

  it('is off when the page is not the whole group: more services than rows, or a later page', () => {
    expect(serviceDragState({ ...ready, rows: 50, total: 60 })).toMatchObject({ on: false, hint: true });
    expect(serviceDragState({ ...ready, page: 2, rows: 10, total: 60 })).toMatchObject({
      on: false,
      hint: true,
    });
    expect(serviceDragState({ ...ready, total: undefined })).toMatchObject({ on: false });
  });

  it('is off, with no line, while the page before is kept on screen for the next one', () => {
    expect(serviceDragState({ ...ready, stale: true })).toEqual({
      on: false,
      reason: 'Reading the services',
      hint: false,
    });
  });

  it('tells the reasons in order: the lock before typed positions, those before a search', () => {
    const all = { ...ready, typedPositions: 1, q: 'x', group: undefined };
    expect(serviceDragState({ ...all, lock: { disabled: true, title: 'lock' } })).toMatchObject({
      reason: 'lock',
    });
    expect(serviceDragState(all)).toMatchObject({
      reason: 'Save or clear the typed positions first',
    });
    expect(serviceDragState({ ...all, typedPositions: 0 })).toMatchObject({
      reason: 'Clear the search to drag services',
    });
  });
});
