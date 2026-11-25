// Tests for the rules of the Group list: the kind's groups in order, one page of them, the page size in the address, and the position writes
// of the up and down buttons (a plain swap, and the renumbering a tie needs), the search by name and where a group just added shows.
import { describe, expect, it } from 'vitest';
import { groupsMatching, groupsOfKind, locateGroup, moveChanges, pageOf, parseGroupsSize } from './groupList';

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

describe('groupsMatching', () => {
  const named = (id: number, name: string) => ({ id, name });
  const groups = [named(1, 'Apple'), named(2, 'Samsung'), named(3, 'Carrier unlock'), named(4, 'apple pay')];

  it('keeps the groups whose name holds the text anywhere, ignoring case', () => {
    expect(groupsMatching(groups, 'APPLE').map((g) => g.id)).toEqual([1, 4]);
    expect(groupsMatching(groups, 'ung').map((g) => g.id)).toEqual([2]);
    expect(groupsMatching(groups, 'r unl').map((g) => g.id)).toEqual([3]);
  });

  it('trims the spaces around the text, but not the ones inside it', () => {
    expect(groupsMatching(groups, '  samsung ').map((g) => g.id)).toEqual([2]);
    expect(groupsMatching(groups, 'apple p').map((g) => g.id)).toEqual([4]);
  });

  it('keeps every group, in order and as a new list, for an empty or blank text', () => {
    expect(groupsMatching(groups, '')).toEqual(groups);
    expect(groupsMatching(groups, '   ')).toEqual(groups);
    expect(groupsMatching(groups, '')).not.toBe(groups);
  });

  it('keeps none when nothing matches, and does not read a text as a pattern', () => {
    expect(groupsMatching(groups, 'zzz')).toEqual([]);
    expect(groupsMatching(groups, '.*')).toEqual([]);
  });
});

describe('locateGroup', () => {
  const list = Array.from({ length: 120 }, (_, at) => ({ id: at + 1, name: `Group ${at + 1}` }));

  it('is the page that holds the group at this size', () => {
    expect(locateGroup(list, 1, '', 50)).toEqual({ page: 1, q: '' });
    expect(locateGroup(list, 50, '', 50)).toEqual({ page: 1, q: '' });
    expect(locateGroup(list, 51, '', 50)).toEqual({ page: 2, q: '' });
    expect(locateGroup(list, 120, '', 50)).toEqual({ page: 3, q: '' });
    expect(locateGroup(list, 120, '', 25)).toEqual({ page: 5, q: '' });
  });

  it('counts the place among the matches when the search shows the group, and keeps the search trimmed', () => {
    // "group 1" matches 1, 10-19 and 100-120 (32 groups); Group 119 is the 31st, so it is on page 4 of 10.
    expect(locateGroup(list, 119, ' group 1 ', 10)).toEqual({ page: 4, q: 'group 1' });
  });

  it('drops a search that would hide the group, and counts the place in the whole list', () => {
    expect(locateGroup(list, 60, 'zzz', 50)).toEqual({ page: 2, q: '' });
    expect(locateGroup(list, 60, 'Group 1', 50)).toEqual({ page: 2, q: '' });
  });

  it('is null for a group the list does not hold', () => {
    expect(locateGroup(list, 999, '', 50)).toBeNull();
    expect(locateGroup([], 1, '', 50)).toBeNull();
  });
});
