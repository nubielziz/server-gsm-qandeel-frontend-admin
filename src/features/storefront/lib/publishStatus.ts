// How one row of the preview shows its state: the badge (Ready, Needs a look, Cannot publish), the line under it that says why, and
// the small neutral marks for the soft flags. Pure: it only turns what the server sent (`state`, `blockedReason`, `flags`) into
// words from `publishWords.ts`; the console decides nothing about a row.
import type { BadgeTone, IconName } from '@/components/ui';
import type { PublishFlag, PublishItem } from '../types';
import { BLOCK_FIX, BLOCK_WORDS, FLAG_WORDS, isHardFlag } from './publishWords';

/** The soft flags: the row stays ready and the console shows a neutral mark. */
export type PublishSoftFlag =
  | 'title_81_100'
  | 'title_lacks_brand'
  | 'brackets_repaired'
  | 'marketing_kept'
  | 'slug_suffixed'
  | 'price_at_floor'
  | 'no_brand'
  | 'country_from_group'
  | 'carrier_no_country'
  | 'price_kept';

/** The detail flags of a blocked row: which half of `price_missing` it is. */
export const DETAIL_FLAGS: readonly PublishFlag[] = ['no_rule', 'no_cost'];

/** The short word of each soft mark (its tooltip is the flag's phrase). */
export const SOFT_MARKS: Record<PublishSoftFlag, string> = {
  title_81_100: 'Long title',
  title_lacks_brand: 'Brand not in title',
  brackets_repaired: 'Brackets repaired',
  marketing_kept: 'Marketing word kept',
  slug_suffixed: 'Address numbered',
  price_at_floor: 'At the floor',
  no_brand: 'No brand',
  country_from_group: 'Country from group',
  carrier_no_country: 'No country',
  price_kept: 'Price kept',
};

/** Whether a flag is one of the soft marks. */
export function isSoftFlag(flag: PublishFlag): flag is PublishSoftFlag {
  return flag in SOFT_MARKS;
}

/** "the title is over 100 characters" as a sentence start: "The title is over 100 characters". */
export function capital(text: string): string {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

/** What the status column draws: the badge, the line under it, the tooltip of the badge and the soft marks. */
export type StatusView = {
  tone: BadgeTone;
  icon: IconName;
  label: string;
  /** Why, in the server's terms: the hard flags of a row to look at, or the reason a row cannot be published. */
  note: string | null;
  /** What staff can do about it (empty when nothing can be done in the console). */
  hint: string | undefined;
  marks: { flag: PublishSoftFlag; label: string; title: string }[];
};

/** The status column of one row. */
export function statusView(item: Pick<PublishItem, 'state' | 'blockedReason' | 'flags'>): StatusView {
  const marks = item.flags.filter(isSoftFlag).map((flag) => ({
    flag,
    label: SOFT_MARKS[flag],
    title: capital(FLAG_WORDS[flag]),
  }));
  if (item.state === 'blocked') {
    const reason = item.blockedReason;
    const details = item.flags.filter((flag) => DETAIL_FLAGS.includes(flag));
    const note = [
      reason ? `${capital(BLOCK_WORDS[reason])}.` : '',
      ...details.map((f) => `${capital(FLAG_WORDS[f])}.`),
    ];
    return {
      tone: 'crit',
      icon: 'xCircle',
      label: 'Cannot publish',
      note: note.filter(Boolean).join(' ') || null,
      hint: (reason && BLOCK_FIX[reason]) || undefined,
      marks,
    };
  }
  if (item.state === 'review') {
    const words = item.flags.filter(isHardFlag).map((flag) => FLAG_WORDS[flag]);
    return {
      tone: 'warn',
      icon: 'alert',
      label: 'Needs a look',
      note: words.length > 0 ? `${capital(words.join(', '))}.` : null,
      hint: undefined,
      marks,
    };
  }
  return { tone: 'good', icon: 'checkCircle', label: 'Ready', note: null, hint: undefined, marks };
}
