// Display helpers for the help centre table. Ports `helpfulOf` and the "Need a rewrite" test of tabHelp in 50-p-storefront.js.
// They only reshape the votes the server counted for the screen; no decision depends on them.
import type { HelpArticle } from '../types';

/** Votes below this share (in percent) count as "most readers said no". */
export const WEAK_BELOW_PCT = 70;

/** Votes it takes before a low share means something. */
export const WEAK_MIN_VOTES = 30;

/** Share of readers who found the article helpful, 0 to 100 (0 with no votes). */
export function helpfulPct(article: Pick<HelpArticle, 'helpfulYes' | 'helpfulNo'>): number {
  const votes = article.helpfulYes + article.helpfulNo;
  return votes ? (article.helpfulYes / votes) * 100 : 0;
}

/** The votes in total. */
export function voteCount(article: Pick<HelpArticle, 'helpfulYes' | 'helpfulNo'>): number {
  return article.helpfulYes + article.helpfulNo;
}

/** A published article with enough votes and a low share: the demo's "Most readers said this did not help". */
export function needsRewrite(article: HelpArticle): boolean {
  return article.isPublished && voteCount(article) >= WEAK_MIN_VOTES && helpfulPct(article) < WEAK_BELOW_PCT;
}
