// Tests for the rules of the Group list: the kind's groups in order, one page of them, the page size in the address, and the position writes
// of the up and down buttons (a plain swap, and the renumbering a tie needs).
import { describe, expect, it } from 'vitest';
import { groupsOfKind, moveChanges, pageOf, parseGroupsSize } from './groupList';

const group = (id: number, sort: number, type: 'imei' | 'server' = 'imei') => ({ id, sort, type });

describe('parseGroupsSize', () => {
  it('reads a whole number from 1 to 200', () => {
    expect(parseGroupsSize('25')).toBe(25);
    expect(parseGroupsSize('200')).toBe(200);
    expect(parseGroupsSize('1')).toBe(1);
  });

  it('is 50 for a missing, odd or too large value', () => {
    expect(parseGroupsSize(null)).toBe(50);
    expect(parseGroupsSize('')).toBe(50);
    expect(parseGroupsSize('0')).toBe(50);
    expect(parseGroupsSize('-5')).toBe(50);
    expect(parseGroupsSize('12abc')).toBe(50);
    expect(parseGroupsSize('201')).toBe(50);
  });
});

describe('groupsOfKind', () => {
  it('keeps the groups of the kind, by position and then by id', () => {
    const all = [group(4, 2), group(9, 1, 'server'), group(2, 2), group(7, 0), group(5, 3, 'server')];
    expect(groupsOfKind(all, 'imei').map((row) => row.id)).toEqual([7, 2, 4]);
    expect(groupsOfKind(all, 'server').map((row) => row.id)).toEqual([9, 5]);
    expect(groupsOfKind(all, 'file')).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const all = [group(2, 2), group(1, 1)];
    groupsOfKind(all, 'imei');
    expect(all.map((row) => row.id)).toEqual([2, 1]);
  });
});

describe('pageOf', () => {
  const items = [1, 2, 3, 4, 5];

  it('cuts a page', () => {
    expect(pageOf(items, 1, 2)).toEqual({ rows: [1, 2], page: 1 });
    expect(pageOf(items, 2, 2)).toEqual({ rows: [3, 4], page: 2 });
    expect(pageOf(items, 3, 2)).toEqual({ rows: [5], page: 3 });
  });

  it('shows the last page for a page past the end and the first for a page before it', () => {
    expect(pageOf(items, 9, 2)).toEqual({ rows: [5], page: 3 });
    expect(pageOf(items, 0, 2)).toEqual({ rows: [1, 2], page: 1 });
  });

  it('shows page 1 of an empty list', () => {
    expect(pageOf([], 4, 50)).toEqual({ rows: [], page: 1 });
  });
});

describe('moveChanges', () => {
  it('swaps the positions of two neighbours', () => {
    const ordered = [group(1, 1), group(2, 2), group(3, 3)];
    expect(moveChanges(ordered, 2, 'up')).toEqual([
      { id: 2, sort: 1 },
      { id: 1, sort: 2 },
    ]);
    expect(moveChanges(ordered, 2, 'down')).toEqual([
      { id: 3, sort: 2 },
      { id: 2, sort: 3 },
    ]);
  });

  it('swaps numbers that are not next to each other and leaves the rest alone', () => {
    const ordered = [group(1, 10), group(2, 40), group(3, 90)];
    expect(moveChanges(ordered, 3, 'up')).toEqual([
      { id: 3, sort: 40 },
      { id: 2, sort: 90 },
    ]);
  });

  it('does nothing at the ends, or for a group that is not in the list', () => {
    const ordered = [group(1, 1), group(2, 2)];
    expect(moveChanges(ordered, 1, 'up')).toEqual([]);
    expect(moveChanges(ordered, 2, 'down')).toEqual([]);
    expect(moveChanges(ordered, 9, 'up')).toEqual([]);
    expect(moveChanges([], 1, 'down')).toEqual([]);
  });

  it('gives a tied pair different numbers, so the move shows', () => {
    const ordered = [group(1, 0), group(2, 0)];
    expect(moveChanges(ordered, 2, 'up')).toEqual([{ id: 1, sort: 1 }]);
    expect(moveChanges(ordered, 1, 'down')).toEqual([{ id: 1, sort: 1 }]);
  });

  it('renumbers the groups after a tie so that their order stays', () => {
    const ordered = [group(1, 0), group(2, 0), group(3, 0), group(4, 0)];
    // Group 3 moves above group 2; group 4 must stay after both.
    expect(moveChanges(ordered, 3, 'up')).toEqual([
      { id: 3, sort: 1 },
      { id: 2, sort: 2 },
      { id: 4, sort: 3 },
    ]);
  });

  it('stops at the first group that already is above the one before it', () => {
    const ordered = [group(1, 5), group(2, 5), group(3, 9), group(4, 9)];
    // Group 2 moves above group 1: group 1 takes 6, group 3 (9) is already above 6, and group 4 is not looked at.
    expect(moveChanges(ordered, 2, 'up')).toEqual([{ id: 1, sort: 6 }]);
  });

  it('keeps the groups before the moved pair as they are', () => {
    const ordered = [group(1, 1), group(2, 2), group(3, 3), group(4, 4)];
    expect(moveChanges(ordered, 4, 'up')).toEqual([
      { id: 4, sort: 3 },
      { id: 3, sort: 4 },
    ]);
  });
});
