// Tests for the words of the Publish tab's closed lists: each map holds exactly the entries of the list the server sends, the lists
// are the ones of the backend plan (section 3.2), the hard flags are the five that send a row to "Needs a look", and a row's result
// reads as its badge and its reason. The mock's 60 rows cover every blocking reason and every flag.
import { describe, expect, it } from 'vitest';
import { buildPublishItems } from '../mocks/publishRows';
import { PUBLISH_BLOCK_REASONS, PUBLISH_FLAGS, PUBLISH_RESULT_REASONS, type PublishItem } from '../types';
import {
  BLOCK_FIX,
  BLOCK_WORDS,
  FLAG_WORDS,
  HARD_FLAGS,
  isHardFlag,
  RESULT_WORDS,
  resultReasonText,
  resultWords,
} from './publishWords';

const keysOf = (map: Record<string, unknown>) => Object.keys(map).sort();

describe('the word maps against the unions', () => {
  it('has a phrase for each blocking reason, and a hint for what staff can do', () => {
    expect(keysOf(BLOCK_WORDS)).toEqual([...PUBLISH_BLOCK_REASONS].sort());
    expect(keysOf(BLOCK_FIX)).toEqual([...PUBLISH_BLOCK_REASONS].sort());
  });

  it('has a phrase for each flag', () => {
    expect(keysOf(FLAG_WORDS)).toEqual([...PUBLISH_FLAGS].sort());
  });

  it('has a phrase for each reason a row can end with', () => {
    expect(keysOf(RESULT_WORDS)).toEqual([...PUBLISH_RESULT_REASONS].sort());
  });

  it('names the three phrases of the plan: category switched off, floor, address and the title of another listing', () => {
    expect(BLOCK_WORDS.category_inactive).toBe('its category is switched off');
    expect(BLOCK_WORDS.below_floor).toBe('the typed price is under the floor');
    expect(BLOCK_WORDS.slug_taken).toBe('the address is taken');
    expect(RESULT_WORDS.cost_moved).toBe('the cost changed a lot since the preview');
    expect(FLAG_WORDS.title_taken).toBe('another listing has this title');
  });

  it('keeps the lists as the backend plan has them, in its order', () => {
    expect(PUBLISH_BLOCK_REASONS).toEqual([
      'already_listed',
      'service_disabled',
      'category_inactive',
      'b2b_only',
      'not_orderable',
      'supplier_unavailable',
      'out_of_stock',
      'title_missing',
      'title_too_long',
      'price_missing',
      'below_floor',
      'slug_taken',
    ]);
    expect(PUBLISH_FLAGS).toHaveLength(17);
    // Every reason a row can be blocked for is also a reason it can end with.
    for (const reason of PUBLISH_BLOCK_REASONS) expect(PUBLISH_RESULT_REASONS).toContain(reason);
  });

  it('words a service delivered from code stock that has no codes and no supplier', () => {
    expect(BLOCK_WORDS.out_of_stock).toBe('it has no codes in stock and no supplier');
    expect(BLOCK_FIX.out_of_stock).toBe('Import codes, then try again.');
    expect(RESULT_WORDS.out_of_stock).toBe('it has no codes in stock and no supplier');
  });

  it('writes every phrase in plain English letters', () => {
    const phrases = [
      ...Object.values(BLOCK_WORDS),
      ...Object.values(BLOCK_FIX),
      ...Object.values(FLAG_WORDS),
      ...Object.values(RESULT_WORDS),
    ];
    for (const phrase of phrases) expect(phrase).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe('the hard flags', () => {
  it('are the five of the plan, and no soft flag or detail flag is one', () => {
    expect([...HARD_FLAGS]).toEqual([
      'title_long',
      'duplicate_name',
      'title_taken',
      'quantity_text',
      'multi_country',
    ]);
    expect(PUBLISH_FLAGS.filter(isHardFlag)).toEqual([...HARD_FLAGS]);
    expect(isHardFlag('no_rule')).toBe(false);
    expect(isHardFlag('price_at_floor')).toBe(false);
  });
});

describe('resultWords', () => {
  const row = (
    result: PublishItem['result'],
    resultReason: PublishItem['resultReason'],
    resultDetail: string | null = null,
  ) => ({
    result,
    resultReason,
    resultDetail,
  });

  it('reads a row with no result as waiting', () => {
    expect(resultWords(row(null, null))).toEqual({
      tone: 'neutral',
      icon: 'clock',
      label: 'Waiting',
      note: null,
    });
  });

  it('reads a published row as Published, with the server’s detail as its note', () => {
    expect(resultWords(row('published', null)).note).toBeNull();
    expect(resultWords(row('published', null, 'A price typed since the preview was kept.'))).toMatchObject({
      tone: 'good',
      label: 'Published',
      note: 'A price typed since the preview was kept.',
    });
  });

  it('reads a left-out row as Left out with no reason, and another reason as a sentence', () => {
    expect(resultWords(row('skipped', 'left_out'))).toMatchObject({
      tone: 'neutral',
      label: 'Left out',
      note: null,
    });
    expect(resultWords(row('skipped', 'category_inactive')).note).toBe('Its category was switched off.');
  });

  it('reads a refused row as Refused with its reason and the server’s detail', () => {
    expect(resultWords(row('refused', 'cost_moved', 'The cost moved from $9.80 to $15.10.'))).toMatchObject({
      tone: 'crit',
      icon: 'xCircle',
      label: 'Refused',
      note: 'The cost changed a lot since the preview. The cost moved from $9.80 to $15.10.',
    });
    expect(resultWords(row('refused', 'failed', 'service_listings_slug_uq')).note).toBe(
      'An unexpected error stopped it. service_listings_slug_uq',
    );
  });

  it('shows a reason this console does not know as the server sent it', () => {
    expect(resultReasonText('some_new_reason')).toBe('some_new_reason');
    expect(resultReasonText(null)).toBe('');
  });
});

describe('the mock’s 60 rows', () => {
  const rows = buildPublishItems(new Map(), new Map(), '2026-11-17T10:00:00.000Z');

  it('are 60 rows with ids 1 to 60 and a service each', () => {
    expect(rows).toHaveLength(60);
    expect(rows.map((row) => row.id)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(new Set(rows.map((row) => row.serviceId)).size).toBe(60);
  });

  it('show every blocking reason but already_listed, which only a ticked service gives', () => {
    const reasons = new Set(rows.map((row) => row.blockedReason).filter(Boolean));
    expect([...reasons].sort()).toEqual(
      PUBLISH_BLOCK_REASONS.filter((reason) => reason !== 'already_listed').sort(),
    );
  });

  it('show every flag of the list', () => {
    const flags = new Set(rows.flatMap((row) => row.flags));
    expect([...flags].sort()).toEqual([...PUBLISH_FLAGS].sort());
  });

  it('show every state, tick the ready rows only, and keep a blocked row out', () => {
    const count = (state: string) => rows.filter((row) => row.state === state).length;
    expect([count('ready'), count('review'), count('blocked')]).toEqual([30, 11, 19]);
    expect(rows.filter((row) => row.included).every((row) => row.state === 'ready')).toBe(true);
    expect(
      rows.filter((row) => row.state === 'blocked').every((row) => !row.included && row.blockedReason),
    ).toBe(true);
    // A row with a hard flag needs a look; a row with only soft flags stays ready.
    expect(rows.filter((row) => row.state === 'review').every((row) => row.flags.some(isHardFlag))).toBe(
      true,
    );
    expect(rows.filter((row) => row.state === 'ready').every((row) => !row.flags.some(isHardFlag))).toBe(
      true,
    );
  });

  it('give a row without a rule or without a cost no price, and keep every other price at or above its floor', () => {
    for (const row of rows) {
      if (row.flags.includes('no_rule') || row.flags.includes('no_cost')) expect(row.retailPrice).toBeNull();
      else if (row.retailPrice !== null && row.blockedReason !== 'below_floor')
        expect(Number(row.retailPrice)).toBeGreaterThanOrEqual(Number(row.floorPrice));
    }
  });

  it('hold the hard cases of titles: none at all, over 200 characters, over 100 and between 81 and 100', () => {
    const missing = rows.find((row) => row.blockedReason === 'title_missing')!;
    expect(missing.title).toBe('');
    // The raw name of that row is not Latin: it is kept as the supplier sent it and shown with dir="auto".
    expect(/[a-z]/i.test(missing.service.name)).toBe(false);
    expect(rows.find((row) => row.blockedReason === 'title_too_long')!.title.length).toBeGreaterThan(200);
    expect(rows.find((row) => row.flags.includes('title_long'))!.title.length).toBeGreaterThan(100);
    expect(rows.find((row) => row.flags.includes('title_81_100'))!.title.length).toBeLessThanOrEqual(100);
  });
});
