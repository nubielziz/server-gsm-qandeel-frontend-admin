// Tests for the reasons a rank change is refused, in words: every code has its words, an error is read for the blockers it lists, and
// an error of another kind lists none.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  isRankBlockerCode,
  RANK_BLOCKER_CODES,
  RANK_BLOCKER_WORDS,
  rankBlockersOf,
  rankBlockerWords,
} from './rankChangeBlockers';

describe('the words', () => {
  it('gives each of the ten refusal codes of a rank change its own sentence', () => {
    expect(RANK_BLOCKER_CODES).toEqual([
      'guest',
      'open_hold',
      'live_order',
      'open_topup',
      'open_dispute',
      'open_refund',
      'open_checkout',
      'frozen',
      'negative_balance',
      'credit_limit',
    ]);
    const words = RANK_BLOCKER_CODES.map((code) => RANK_BLOCKER_WORDS[code]);
    expect(new Set(words).size).toBe(10);
    for (const sentence of words) expect(sentence).toMatch(/\.$/);
  });

  it('turns a code into words and leaves any other text as it is', () => {
    expect(isRankBlockerCode('frozen')).toBe(true);
    expect(isRankBlockerCode('constructor')).toBe(false);
    expect(rankBlockerWords('frozen')).toBe(RANK_BLOCKER_WORDS.frozen);
    expect(rankBlockerWords('Something new needs attention.')).toBe('Something new needs attention.');
    expect(rankBlockerWords('constructor')).toBe('constructor');
  });
});

describe('rankBlockersOf', () => {
  const refused = (init: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
    new ApiError({ status: 409, code: 'RANK_CHANGE_BLOCKED', ...init });

  it('lists the words of every blocker the server named, without repeats', () => {
    const error = refused({ fieldErrors: { groupId: ['open_hold', 'live_order', 'open_hold'] } });
    expect(rankBlockersOf(error)).toEqual([RANK_BLOCKER_WORDS.open_hold, RANK_BLOCKER_WORDS.live_order]);
  });

  it('shows a message the server wrote as it is, and reads codes first when the error carries them', () => {
    expect(rankBlockersOf(refused({ fieldErrors: { groupId: ['The wallet is on hold.'] } }))).toEqual([
      'The wallet is on hold.',
    ]);
    const withCodes = Object.assign(refused({ fieldErrors: { groupId: ['The wallet is on hold.'] } }), {
      fieldCodes: { groupId: ['frozen', 'negative_balance'] },
    });
    expect(rankBlockersOf(withCodes)).toEqual([
      RANK_BLOCKER_WORDS.frozen,
      RANK_BLOCKER_WORDS.negative_balance,
    ]);
  });

  it('reads the messages that name no field too', () => {
    expect(rankBlockersOf(refused({ formErrors: ['guest'] }))).toEqual([RANK_BLOCKER_WORDS.guest]);
  });

  it('lists nothing for an error of another kind, and for something that is no error', () => {
    expect(
      rankBlockersOf(new ApiError({ status: 409, code: 'CONFLICT', fieldErrors: { groupId: ['frozen'] } })),
    ).toEqual([]);
    expect(rankBlockersOf(new Error('boom'))).toEqual([]);
    expect(rankBlockersOf(undefined)).toEqual([]);
    expect(rankBlockersOf(refused())).toEqual([]);
  });
});
