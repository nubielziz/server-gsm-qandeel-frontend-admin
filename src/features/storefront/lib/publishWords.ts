// The words of the Publish tab's closed lists: why a row cannot be published, the flags a row carries and how a row ended when the
// run was applied. One map per list; the type of each map makes a missing entry a compile error and `publishWords.test.ts` checks
// every map against the list the server sends (`PUBLISH_BLOCK_REASONS`, `PUBLISH_FLAGS`, `PUBLISH_RESULT_REASONS`). The words say
// what the server found; the console decides nothing.
import type { BadgeTone, IconName } from '@/components/ui';
import type {
  PublishBlockReason,
  PublishFlag,
  PublishItem,
  PublishResult,
  PublishResultReason,
} from '../types';

/** Why a row cannot be published, as the end of "Cannot publish: ...". */
export const BLOCK_WORDS: Record<PublishBlockReason, string> = {
  already_listed: 'it already has a listing',
  service_disabled: 'the service is switched off',
  category_inactive: 'its category is switched off',
  b2b_only: 'its category is closed to the public',
  not_orderable: 'it cannot be ordered online',
  supplier_unavailable: 'no supplier can fill it now',
  title_missing: 'it has no title',
  title_too_long: 'the title is over 200 characters',
  price_missing: 'it has no price',
  below_floor: 'the typed price is under the floor',
  slug_taken: 'the address is taken',
};

/** What staff can do about a blocked row, for the tooltip of its badge. An empty text means nothing can be done in the console. */
export const BLOCK_FIX: Record<PublishBlockReason, string> = {
  already_listed: 'It is on the Services on sale tab.',
  service_disabled: 'Enable the service, then check again.',
  category_inactive: 'Switch the category on, then check again.',
  b2b_only: 'Open the category to the public, then check again.',
  not_orderable: 'File services cannot be sold on the shop.',
  supplier_unavailable: 'Link or resume a supplier, then check again.',
  title_missing: 'Type a title in the row.',
  title_too_long: 'Shorten the title in the row.',
  price_missing: 'Make a pricing rule and check again, or type a price in the row.',
  below_floor: 'Type a price at or above the floor, or use the pricing rule.',
  slug_taken: 'Type another address, or empty the field.',
};

/** What a flag says about a row, as a short phrase. */
export const FLAG_WORDS: Record<PublishFlag, string> = {
  title_long: 'the title is over 100 characters',
  duplicate_name: 'another row has the same supplier name',
  title_taken: 'another listing has this title',
  quantity_text: 'the quantity is inside the name',
  multi_country: 'it names several countries',
  title_81_100: 'the title is 81 to 100 characters',
  title_lacks_brand: 'the title does not say the brand',
  brackets_repaired: 'brackets in the name were repaired',
  marketing_kept: 'a marketing word was kept',
  slug_suffixed: 'the address got a number to stay unique',
  price_at_floor: 'the price was lifted to the floor',
  no_brand: 'no brand was found',
  country_from_group: 'the country comes from the supplier group',
  carrier_no_country: 'a carrier with no country',
  price_kept: 'the service keeps its current price',
  no_rule: 'no pricing rule covers it',
  no_cost: 'the cost is zero',
};

/** The flags that send a row to "Needs a look"; every other flag is a neutral mark and the row stays ready. */
export const HARD_FLAGS: readonly PublishFlag[] = [
  'title_long',
  'duplicate_name',
  'title_taken',
  'quantity_text',
  'multi_country',
];

/** Whether a flag asks for a person to look at the row. */
export function isHardFlag(flag: PublishFlag): boolean {
  return HARD_FLAGS.includes(flag);
}

/** Why a row ended as it did, as the end of "Refused: ..." or "Not published: ...". `left_out` has no sentence of its own. */
export const RESULT_WORDS: Record<PublishResultReason, string> = {
  left_out: 'it was left out',
  already_listed: 'it was listed meanwhile',
  service_gone: 'the service was deleted',
  service_disabled: 'the service was switched off',
  category_inactive: 'its category was switched off',
  b2b_only: 'its category is closed to the public',
  not_orderable: 'it cannot be ordered online',
  supplier_unavailable: 'no supplier can fill it now',
  title_missing: 'it has no title',
  title_too_long: 'the title is over 200 characters',
  price_missing: 'it has no price',
  below_floor: 'the typed price is under the floor',
  cost_moved: 'the cost changed a lot since the preview',
  slug_taken: 'the address is taken',
  failed: 'an unexpected error stopped it',
};

/** The words of a result reason; a reason this console does not know is shown as the server sent it. */
export function resultReasonText(reason: string | null): string {
  if (!reason) return '';
  return (RESULT_WORDS as Record<string, string | undefined>)[reason] ?? reason;
}

/** How a row's result shows: a badge (tone, icon, word) and the line under it, which says why when the row did not go on the shop. */
export type ResultWords = { tone: BadgeTone; icon: IconName; label: string; note: string | null };

const RESULT_BADGE: Record<PublishResult, { tone: BadgeTone; icon: IconName; label: string }> = {
  published: { tone: 'good', icon: 'checkCircle', label: 'Published' },
  skipped: { tone: 'neutral', icon: 'ban', label: 'Left out' },
  refused: { tone: 'crit', icon: 'xCircle', label: 'Refused' },
};

/** The result column of one row: no result yet reads "Waiting". The server's `resultDetail` is kept as the note of a published row. */
export function resultWords(
  item: Pick<PublishItem, 'result' | 'resultReason' | 'resultDetail'>,
): ResultWords {
  if (item.result === null) return { tone: 'neutral', icon: 'clock', label: 'Waiting', note: null };
  const badge = RESULT_BADGE[item.result];
  const why =
    item.resultReason && item.resultReason !== 'left_out' ? resultReasonText(item.resultReason) : '';
  if (item.result === 'published') return { ...badge, note: item.resultDetail };
  const note = [why ? `${why.charAt(0).toUpperCase()}${why.slice(1)}.` : '', item.resultDetail ?? '']
    .filter(Boolean)
    .join(' ');
  return { ...badge, note: note || null };
}
