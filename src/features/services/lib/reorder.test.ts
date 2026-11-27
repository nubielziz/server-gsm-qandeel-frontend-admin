// Tests for the rules of dragging a row to a new place (decision 038): the positions that change when an item moves over one place or many, the
// renumbering a tie needs, the list as it looks after the move, the two indexes of a drop, the order held while a save runs, why dragging is off
// and the server's words of a refusal.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  afterMove,
  dragState,
  dropIndexes,
  holdOver,
  moveWithin,
  refusalWords,
  reorderChanges,
  type PositionChange,
} from './reorder';

const item = (id: number, sort: number) => ({ id, sort });
/** Applies the changes to a list the way the server would and reads the ids in the order the numbers give (ties by id). */
function order(list: readonly { id: number; sort: number }[], changes: readonly PositionChange[]): number[] {
  const sorts = new Map(changes.map((change) => [change.id, change.sort]));
  return list
    .map((entry) => ({ id: entry.id, sort: sorts.get(entry.id) ?? entry.sort }))
    .sort((a, b) => a.sort - b.sort || a.id - b.id)
    .map((entry) => entry.id);
}

describe('moveWithin', () => {
  it('takes an item out and puts it at the new index, and does not change its input', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(moveWithin(list, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveWithin(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('reorderChanges', () => {
  const spread = [item(1, 10), item(2, 20), item(3, 30), item(4, 40), item(5, 50)];

  it('sends nothing for a drop on the same place or outside the list', () => {
    expect(reorderChanges(spread, 2, 2)).toEqual([]);
    expect(reorderChanges(spread, -1, 2)).toEqual([]);
    expect(reorderChanges(spread, 2, 5)).toEqual([]);
    expect(reorderChanges(spread, 1.5, 2)).toEqual([]);
    expect(reorderChanges([], 0, 1)).toEqual([]);
  });

  it('moves over one place by swapping the two numbers', () => {
    expect(reorderChanges(spread, 1, 0)).toEqual([
      { id: 2, sort: 10 },
      { id: 1, sort: 20 },
    ]);
  });

  it('moves over many places: every item in between takes the number of the place it moves to', () => {
    // Item 5 to the front: 5 takes 10, and 1, 2, 3 and 4 each move down one place, item 4 into the number of item 5.
    const changes = reorderChanges(spread, 4, 0);
    expect(changes).toEqual([
      { id: 5, sort: 10 },
      { id: 1, sort: 20 },
      { id: 2, sort: 30 },
      { id: 3, sort: 40 },
      { id: 4, sort: 50 },
    ]);
    expect(order(spread, changes)).toEqual([5, 1, 2, 3, 4]);
  });

  it('moves down as well, and leaves the items past the move alone', () => {
    const changes = reorderChanges(spread, 0, 2);
    expect(changes).toEqual([
      { id: 2, sort: 10 },
      { id: 3, sort: 20 },
      { id: 1, sort: 30 },
    ]);
    expect(order(spread, changes)).toEqual([2, 3, 1, 4, 5]);
  });

  it('sends only the items whose number changes', () => {
    // Items 1 and 2 share a number; item 2 moves to the front and keeps 5, so only the item it passes gets a new number.
    const list = [item(1, 5), item(2, 5), item(3, 9)];
    expect(reorderChanges(list, 1, 0)).toEqual([{ id: 1, sort: 6 }]);
  });

  it('gives a tie, which a swap cannot tell apart, a number above the one before and stops at the first item that is already above', () => {
    const tied = [item(1, 0), item(2, 0), item(3, 0), item(4, 0)];
    const changes = reorderChanges(tied, 3, 0);
    expect(order(tied, changes)).toEqual([4, 1, 2, 3]);
    // The last item is moved to the front: the front keeps 0, the three it passed become 1, 2 and 3.
    expect(changes).toEqual([
      { id: 1, sort: 1 },
      { id: 2, sort: 2 },
      { id: 3, sort: 3 },
    ]);
  });

  it('numbers the items after the move too when a tie runs past it', () => {
    const tied = [item(1, 0), item(2, 0), item(3, 0)];
    const changes = reorderChanges(tied, 1, 0);
    // 2 first: 2 keeps 0, 1 gets 1, and 3 (which also had 0) must get 2 or it would sort before 1.
    expect(changes).toEqual([
      { id: 1, sort: 1 },
      { id: 3, sort: 2 },
    ]);
    expect(order(tied, changes)).toEqual([2, 1, 3]);
  });

  it('gives the same order for every move of every list with ties, read the way the server reads it (position, then id)', () => {
    const lists = [
      [item(1, 0), item(2, 0), item(3, 0), item(4, 0), item(5, 0)],
      [item(1, 1), item(2, 1), item(3, 2), item(4, 2), item(5, 7)],
      [item(1, 3), item(2, 4), item(3, 5), item(4, 6), item(5, 7)],
    ];
    for (const list of lists) {
      for (let from = 0; from < list.length; from += 1) {
        for (let to = 0; to < list.length; to += 1) {
          const expected = moveWithin(
            list.map((entry) => entry.id),
            from,
            to,
          );
          // The server's tie-break is the id, so renumbered items must not rely on it: the walk gives each moved item its own number.
          expect(order(list, reorderChanges(list, from, to))).toEqual(
            from === to ? list.map((entry) => entry.id) : expected,
          );
        }
      }
    }
  });
});

describe('afterMove', () => {
  it('lists the items in the new order with the new numbers, and keeps their other fields', () => {
    const list = [
      { id: 1, sort: 10, name: 'A' },
      { id: 2, sort: 20, name: 'B' },
      { id: 3, sort: 30, name: 'C' },
    ];
    expect(afterMove(list, 2, 0)).toEqual([
      { id: 3, sort: 10, name: 'C' },
      { id: 1, sort: 20, name: 'A' },
      { id: 2, sort: 30, name: 'B' },
    ]);
    expect(list.map((entry) => entry.id)).toEqual([1, 2, 3]);
  });

  it('is the same list for a move that changes nothing', () => {
    const list = [item(1, 1), item(2, 2)];
    expect(afterMove(list, 1, 1)).toEqual(list);
  });
});

describe('dropIndexes', () => {
  const list = [item(7, 1), item(8, 2), item(9, 3)];

  it('says where the dragged item was and where it was dropped', () => {
    expect(dropIndexes(list, 9, 7)).toEqual({ from: 2, to: 0 });
  });

  it('is null for a drop on itself, on nothing or on an item the list does not hold', () => {
    expect(dropIndexes(list, 8, 8)).toBeNull();
    expect(dropIndexes(list, 8, null)).toBeNull();
    expect(dropIndexes(list, 8, undefined)).toBeNull();
    expect(dropIndexes(list, 8, 99)).toBeNull();
    expect(dropIndexes(list, 99, 8)).toBeNull();
  });
});

describe('holdOver', () => {
  const stored = [
    { id: 1, sort: 1, name: 'one' },
    { id: 2, sort: 2, name: 'two' },
    { id: 3, sort: 3, name: 'three' },
  ];

  it('is the stored list when nothing is held', () => {
    expect(holdOver(stored, null)).toBe(stored);
  });

  it('shows the held order and numbers over the stored fields', () => {
    const held = [
      { id: 3, sort: 1, name: 'old three' },
      { id: 1, sort: 2, name: 'old one' },
      { id: 2, sort: 3, name: 'old two' },
    ];
    expect(holdOver([stored[0], { ...stored[1], name: 'renamed' }, stored[2]], held)).toEqual([
      { id: 3, sort: 1, name: 'three' },
      { id: 1, sort: 2, name: 'one' },
      { id: 2, sort: 3, name: 'renamed' },
    ]);
  });

  it('drops an item the stored list lost and puts one the held list never had last', () => {
    const held = [stored[1], stored[0]];
    expect(holdOver([stored[0], stored[2]], held).map((entry) => entry.id)).toEqual([1, 3]);
    expect(holdOver(stored, held).map((entry) => entry.id)).toEqual([2, 1, 3]);
  });
});

describe('dragState', () => {
  it('is on when no reason holds', () => {
    expect(dragState([{ when: false, reason: 'x', hint: true }])).toEqual({ on: true });
    expect(dragState([])).toEqual({ on: true });
  });

  it('gives the first reason that holds, and whether the view says it in a line', () => {
    expect(
      dragState([
        { when: false, reason: 'one', hint: false },
        { when: true, reason: 'two', hint: true },
        { when: true, reason: 'three', hint: false },
      ]),
    ).toEqual({ on: false, reason: 'two', hint: true });
  });
});

describe('refusalWords', () => {
  const error = (init: ConstructorParameters<typeof ApiError>[0]) => new ApiError(init);

  it('joins the messages of the fields and the form, each once', () => {
    expect(
      refusalWords(
        error({
          status: 422,
          title: 'Check the form',
          detail: 'Some fields need attention.',
          fieldErrors: {
            'items.0.id': ['No category has the id 9.'],
            'items.2.id': ['No category has the id 9.', 'Listed twice.'],
          },
          formErrors: ['Nothing was saved.'],
        }),
      ),
    ).toBe('Nothing was saved. No category has the id 9. Listed twice.');
  });

  it('is the detail when no field is named, and the title when there is no detail', () => {
    expect(refusalWords(error({ status: 403, title: 'No access', detail: 'Positions are locked.' }))).toBe(
      'Positions are locked.',
    );
    expect(refusalWords(error({ status: 500, title: 'Server error' }))).toBe('Server error');
  });
});
