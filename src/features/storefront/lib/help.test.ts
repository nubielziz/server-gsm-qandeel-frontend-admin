// Tests for the help article display helpers: the helpful share, the vote count and the "needs a rewrite" test of the demo.
import { describe, expect, it } from 'vitest';
import type { HelpArticle } from '../types';
import { helpfulPct, needsRewrite, voteCount } from './help';

const article = (yes: number, no: number, isPublished = true) =>
  ({ helpfulYes: yes, helpfulNo: no, isPublished }) as HelpArticle;

describe('helpfulPct and voteCount', () => {
  it('works out the share of yes votes, and 0 with no votes', () => {
    expect(helpfulPct(article(3, 1))).toBe(75);
    expect(helpfulPct(article(0, 0))).toBe(0);
    expect(voteCount(article(142, 9))).toBe(151);
  });
});

describe('needsRewrite', () => {
  it('needs 30 votes and under 70% helpful, on a published article', () => {
    expect(needsRewrite(article(77, 52))).toBe(true); // 60% of 129
    expect(needsRewrite(article(96, 31))).toBe(false); // 76%
    expect(needsRewrite(article(10, 15))).toBe(false); // too few votes
    expect(needsRewrite(article(77, 52, false))).toBe(false); // a draft
  });
});
