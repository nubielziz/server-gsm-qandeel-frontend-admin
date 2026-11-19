// Tests for how one row of the preview shows its state: the badge (tone, icon, word), the line that says why, the hint of a blocked
// row and the neutral marks of the soft flags. The mock's 60 rows cover every state, blocking reason and flag of the plan.
import { describe, expect, it } from 'vitest';
import { buildPublishItems } from '../mocks/publishRows';
import { PUBLISH_BLOCK_REASONS, PUBLISH_FLAGS, type PublishFlag } from '../types';
import { BLOCK_FIX } from './publishWords';
import { capital, DETAIL_FLAGS, isSoftFlag, SOFT_MARKS, statusView } from './publishStatus';
import { HARD_FLAGS } from './publishWords';

const rows = buildPublishItems(new Map(), new Map(), '2026-11-18T09:00:00.000Z');
const row = (id: number) => rows[id - 1];

describe('capital', () => {
  it('starts a phrase with a capital letter and leaves an empty text alone', () => {
    expect(capital('the title is over 100 characters')).toBe('The title is over 100 characters');
    expect(capital('')).toBe('');
  });
});

describe('the soft marks', () => {
  it('are every flag that is neither a hard flag nor a detail of a blocked row', () => {
    const soft = PUBLISH_FLAGS.filter((flag) => !HARD_FLAGS.includes(flag) && !DETAIL_FLAGS.includes(flag));
    expect(Object.keys(SOFT_MARKS).sort()).toEqual([...soft].sort());
    for (const flag of PUBLISH_FLAGS) expect(isSoftFlag(flag)).toBe(soft.includes(flag));
  });
});

describe('statusView of a ready row', () => {
  it('is a good badge with no reason', () => {
    expect(statusView(row(1))).toEqual({
      tone: 'good',
      icon: 'checkCircle',
      label: 'Ready',
      note: null,
      hint: undefined,
      marks: [],
    });
  });

  it('adds a neutral mark with a tooltip for each soft flag, and the row stays Ready', () => {
    const view = statusView(row(7));
    expect(view.label).toBe('Ready');
    expect(view.marks).toEqual([
      { flag: 'price_at_floor', label: 'At the floor', title: 'The price was lifted to the floor' },
    ]);
    expect(statusView(row(5)).marks.map((mark) => mark.label)).toEqual(['Brackets repaired']);
    expect(statusView(row(20)).marks.map((mark) => mark.label)).toEqual(['Price kept']);
  });

  it('shows every soft flag a row carries, in the order the server sent them', () => {
    const flags: PublishFlag[] = ['no_brand', 'country_from_group', 'slug_suffixed'];
    const view = statusView({ state: 'ready', blockedReason: null, flags });
    expect(view.marks.map((mark) => mark.flag)).toEqual(flags);
  });
});

describe('statusView of a row that needs a look', () => {
  it('is a warn badge and says why in the words of the hard flags', () => {
    const view = statusView(row(21));
    expect(view).toMatchObject({ tone: 'warn', icon: 'alert', label: 'Needs a look' });
    expect(view.note).toBe('The title is over 100 characters.');
    expect(view.hint).toBeUndefined();
  });

  it('joins several hard flags, and keeps the soft marks apart', () => {
    const view = statusView({
      state: 'review',
      blockedReason: null,
      flags: ['duplicate_name', 'quantity_text', 'slug_suffixed'],
    });
    expect(view.note).toBe('Another row has the same supplier name, the quantity is inside the name.');
    expect(view.marks.map((mark) => mark.label)).toEqual(['Address numbered']);
  });

  it('has no note when no hard flag is set', () => {
    expect(statusView({ state: 'review', blockedReason: null, flags: [] }).note).toBeNull();
  });
});

describe('statusView of a blocked row', () => {
  it('is a crit badge with the reason as a sentence and what staff can do as the hint', () => {
    const view = statusView(row(32));
    expect(view).toMatchObject({ tone: 'crit', icon: 'xCircle', label: 'Cannot publish' });
    expect(view.note).toBe('The service is switched off.');
    expect(view.hint).toBe(BLOCK_FIX.service_disabled);
  });

  it('adds the detail of "no price": no rule, or a cost of zero', () => {
    expect(statusView(row(40)).note).toBe('It has no price. No pricing rule covers it.');
    expect(statusView(row(43)).note).toBe('It has no price. The cost is zero.');
    expect(statusView(row(40)).hint).toBe(BLOCK_FIX.price_missing);
  });

  it('gives every blocking reason a sentence and a hint', () => {
    for (const reason of PUBLISH_BLOCK_REASONS) {
      const view = statusView({ state: 'blocked', blockedReason: reason, flags: [] });
      expect(view.label).toBe('Cannot publish');
      expect(view.note).toMatch(/^[A-Z].*\.$/);
      expect(view.hint).toBe(BLOCK_FIX[reason]);
    }
  });

  it('has no note and no hint for a blocked row the server gave no reason', () => {
    const view = statusView({ state: 'blocked', blockedReason: null, flags: [] });
    expect(view.note).toBeNull();
    expect(view.hint).toBeUndefined();
  });
});
