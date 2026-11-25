// A service row's one shop switch, as pure functions: why a service cannot go on the shop, what the server found when the switch tried
// (a publish row's state or result) with the next step, the switch's lock per move, and the server's words for a refused call. Every
// reason is the server's; this only words it, as the storefront feature does on its publish screens.
import type {
  PublishBlockReason,
  PublishFlag,
  PublishItem,
  PublishResultReason,
  PublishRun,
} from '@/features/storefront';
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import type { Service, ShopBlockReason } from '../types';

/** Why a service cannot go on the shop at all (`shopBlocked`), written beside its disabled switch. */
export const SHOP_BLOCK_WORDS: Record<ShopBlockReason, string> = {
  service_disabled: 'Service switched off',
  category_inactive: 'Category switched off',
  b2b_only: 'Category closed to shop buyers',
  not_orderable: 'Cannot be sold on the shop',
};

/** Where the next step is: the shop price rules, the publish run, or nothing the console can do (the words say what to do). */
export type NextStep = 'rules' | 'run' | null;

/** A try that did not put the service on the shop: what the server found, what to do, and where. */
export type ShopRefusal = { why: string; fix: string; next: NextStep };

type Words = { why: string; fix: string; next: NextStep };

const RUN_FIX = 'Open the run to change it there.';

/** A publish row's blocking reason, as the end of "It cannot go on the shop: …". */
const BLOCK: Record<PublishBlockReason, Words> = {
  already_listed: { why: 'it already has a shop page', fix: 'Reload the list.', next: null },
  service_disabled: { why: 'the service is switched off', fix: 'Enable it, then try again.', next: null },
  category_inactive: {
    why: 'its category is switched off',
    fix: 'Switch the category on, then try again.',
    next: null,
  },
  b2b_only: {
    why: 'its category is closed to shop buyers',
    fix: 'Open the category to the public, then try again.',
    next: null,
  },
  not_orderable: { why: 'it cannot be ordered online', fix: 'File services stay off the shop.', next: null },
  supplier_unavailable: {
    why: 'no supplier can fill it now',
    fix: 'Link or resume a supplier, then try again.',
    next: null,
  },
  out_of_stock: {
    why: 'it has no codes in stock and no supplier',
    fix: 'Import codes, then try again.',
    next: null,
  },
  title_missing: { why: 'it has no title', fix: RUN_FIX, next: 'run' },
  title_too_long: { why: 'its title is too long', fix: RUN_FIX, next: 'run' },
  price_missing: {
    why: 'no shop price rule covers it',
    fix: 'Make a shop price rule, then try again.',
    next: 'rules',
  },
  below_floor: {
    why: 'its shop price is under the floor',
    fix: 'Open the run to type a price at or above the floor, or change the price.',
    next: 'run',
  },
  slug_taken: { why: 'its web address is taken', fix: RUN_FIX, next: 'run' },
};

/** A flag that sends a row to a person ("needs a look"), as the end of "The server flags it: …". */
const REVIEW_FLAGS: Partial<Record<PublishFlag, string>> = {
  title_long: 'its title is over 100 characters',
  duplicate_name: 'another service has the same supplier name',
  title_taken: 'another shop page has this title',
  quantity_text: 'the quantity is inside the name',
  multi_country: 'it names several countries',
};

/** Why a row ended as it did after the run was applied. */
const RESULT: Record<PublishResultReason, string> = {
  left_out: 'it was left out',
  already_listed: 'it got a shop page meanwhile',
  service_gone: 'the service was deleted',
  service_disabled: 'the service was switched off',
  category_inactive: 'its category was switched off',
  b2b_only: 'its category is closed to shop buyers',
  not_orderable: 'it cannot be ordered online',
  supplier_unavailable: 'no supplier can fill it now',
  out_of_stock: 'it has no codes in stock and no supplier',
  title_missing: 'it has no title',
  title_too_long: 'its title is too long',
  price_missing: 'it has no shop price',
  below_floor: 'its shop price is under the floor',
  cost_moved: 'the cost changed a lot meanwhile',
  slug_taken: 'its web address is taken',
  failed: 'an unexpected error stopped it',
};

/**
 * Whether the switch may publish the run's one row: only a row the server says is `ready` (and ticked). Anything else is a refusal
 * in the server's terms: the blocking reason (a missing price with a zero cost points at the run, not at the rules), or the flags
 * that ask a person to look at the name.
 */
export function readinessOf(item: PublishItem | undefined): 'ready' | ShopRefusal {
  if (!item) return { why: 'the server found nothing to publish', fix: 'Reload the list.', next: null };
  if (item.state === 'ready' && item.included) return 'ready';
  if (item.state === 'blocked' && item.blockedReason) {
    if (item.blockedReason === 'price_missing' && item.flags.includes('no_cost')) {
      return {
        why: 'its cost is zero, so no rule can price it',
        fix: 'Open the run to type a price.',
        next: 'run',
      };
    }
    const words = BLOCK[item.blockedReason];
    return { why: words.why, fix: words.fix, next: words.next };
  }
  const flagged = item.flags.map((flag) => REVIEW_FLAGS[flag]).filter(Boolean);
  return {
    why:
      flagged.length > 0
        ? `the server flags it: ${flagged.join(', ')}`
        : 'the server wants a person to look at it',
    fix: 'Open the run to review it.',
    next: 'run',
  };
}

/**
 * What an applied run did with the service: `published`, or a refusal with the row's result reason (a reason this console does not
 * know shows as the server sent it), or the run's own error when it stopped.
 */
export function outcomeOf(run: PublishRun, item: PublishItem | undefined): 'published' | ShopRefusal {
  if (item?.result === 'published') return 'published';
  if (item?.result) {
    const reason = item.resultReason ?? '';
    const why = (RESULT as Record<string, string | undefined>)[reason] ?? (reason || 'it was not published');
    return { why, fix: 'Open the run to see it.', next: 'run' };
  }
  if (run.status === 'queued' || run.status === 'running') {
    return { why: 'it is still being published', fix: 'Open the run to follow it.', next: 'run' };
  }
  return {
    why: run.error ?? 'the run stopped before it finished',
    fix: 'Open the run to continue it.',
    next: 'run',
  };
}

/** The sentence a refusal shows: what was found, then what to do. */
export function refusalSentence(refusal: ShopRefusal): string {
  return `It cannot go on the shop: ${refusal.why}. ${refusal.fix}`;
}

/**
 * The lock of the switch for the move it would make: switching a page off needs `storefront:update`, switching it on also
 * `storefront:publish`, and a service without a page needs `storefront:create` and `storefront:publish` (a run, then its apply).
 */
export function shopLock(service: Service, grants: ServiceGrants): { disabled: boolean; title?: string } {
  const listed = service.isListed === true;
  const blocked = service.shopBlocked ?? null;
  if (blocked !== null && !listed) return { disabled: true, title: SHOP_BLOCK_WORDS[blocked] };
  if (service.listingId == null) return grants.needsAll('storefront:create', 'storefront:publish');
  return listed
    ? grants.needs('storefront:update')
    : grants.needsAll('storefront:update', 'storefront:publish');
}

/** What the switch says while it works: a shop page is being saved, or a service without one is being put on the shop by a run. */
export function shopBusyWords(service: Service): string {
  return service.listingId != null ? 'Saving…' : 'Putting it on the shop…';
}

/** The server's words for a refused call: the first field message (a 422 on `scope` names why), else its detail. */
export function serverWords(error: unknown): string {
  if (isApiError(error)) {
    const message = Object.values(error.fieldErrors).flat()[0];
    if (message) return message;
  }
  return errorText(error);
}
