// What the mock server does to one row of a draft on an edit (the item `PATCH`, plan 5.2): it checks each key as the server does, applies the
// change and works the row out again. It keeps the prices the row already shows and works out no new price, margin or slug rule (M92): the
// margin of a typed price is not known to the mock and reads empty.
import { moneyInput, toMoneyText } from '../lib/money';
import { BLOCK_WORDS, isHardFlag } from '../lib/publishWords';
import { slugOf } from './http';
import type { PublishItem } from '../types';

export type Problem = { field: string; message: string };

/** What an edit needs to know about the rest of the run: the slugs that are taken, and the row the seed started from. */
export type EditContext = { taken: ReadonlySet<string>; seed: PublishItem | undefined };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONEY = /^\d+(\.\d{1,4})?$/;

/** A one-line text key of the body (`title`, `brand`, `carrier`), checked against its length. */
function oneLine(value: unknown, min: number, max: number): string | null {
  const text = typeof value === 'string' ? value.trim() : null;
  return text !== null && text.length >= min && text.length <= max && !/[\r\n]/.test(text) ? text : null;
}

/** The row after a fix made outside the row's own keys: a blocking reason that is gone lets the row leave `blocked`. */
function reevaluate(item: PublishItem, before: PublishItem, tick: boolean | undefined): PublishItem {
  const typed = item.retailPrice !== null;
  const gone =
    (item.blockedReason === 'title_missing' && item.title !== '') ||
    (item.blockedReason === 'title_too_long' && item.title.length <= 200) ||
    (item.blockedReason === 'price_missing' && typed) ||
    (item.blockedReason === 'below_floor' && typed && Number(item.retailPrice) >= Number(item.floorPrice)) ||
    (item.blockedReason === 'slug_taken' && item.slug !== before.slug);
  if (!gone) return item;
  const flags = item.flags.filter((flag) => flag !== 'no_rule' && flag !== 'no_cost');
  const state = flags.some(isHardFlag) ? 'review' : 'ready';
  // A row that leaves `blocked` gets the default of its new state, unless the edit sent a tick.
  return { ...item, flags, state, blockedReason: null, included: tick ?? state === 'ready' };
}

/** Checks the facts and the address of the body and writes them into `next`. */
function readFacts(body: Record<string, unknown>, next: PublishItem, ctx: EditContext, problems: Problem[]) {
  const line = (key: 'title' | 'brand' | 'carrier', min: number, max: number) => {
    if (body[key] === undefined) return;
    const text = oneLine(body[key], min, max);
    if (text === null)
      problems.push({ field: key, message: `Enter ${min ? '1' : 'up'} to ${max} characters on one line.` });
    else Object.assign(next, { [key]: text, edited: true });
  };
  line('title', 1, 200);
  line('brand', 0, 80);
  line('carrier', 0, 80);
  if (body.country !== undefined) {
    const country = typeof body.country === 'string' ? body.country.trim() : null;
    if (country === null || !/^([A-Za-z]{2})?$/.test(country))
      problems.push({ field: 'country', message: 'Use two letters, or leave it empty.' });
    else Object.assign(next, { country: country.toUpperCase(), edited: true });
  }
  if (body.slug !== undefined) {
    // An empty address means "make it from the title again".
    const slug = body.slug === '' ? slugOf(next.title) : body.slug;
    if (typeof slug !== 'string' || slug.length > 120 || (slug !== '' && !SLUG.test(slug))) {
      problems.push({ field: 'slug', message: 'Use lower-case words joined by hyphens.' });
    } else if (slug !== '' && slug !== next.slug && ctx.taken.has(slug)) {
      problems.push({ field: 'slug', message: 'That address is taken by another listing.' });
    } else Object.assign(next, { slug, edited: true });
  }
}

/** Checks the price keys of the body (a typed price, or the pricing rule, or keeping the price) and writes them into `next`. */
function readPrice(
  body: Record<string, unknown>,
  item: PublishItem,
  next: PublishItem,
  ctx: EditContext,
  problems: Problem[],
) {
  const margin = (mode: 'rule' | 'keep') => (ctx.seed?.priceMode === mode ? ctx.seed.marginPct : null);
  if (body.retailPrice !== undefined) {
    const text = typeof body.retailPrice === 'string' ? body.retailPrice.trim() : '';
    if (!MONEY.test(text) || Number(text) <= 0)
      problems.push({ field: 'retailPrice', message: 'Enter a price above zero.' });
    else if (Number(text) < Number(item.floorPrice))
      problems.push({
        field: 'retailPrice',
        message: `Below the storefront floor of $${moneyInput(item.floorPrice)}.`,
      });
    else {
      const flags = next.flags.filter((flag) => flag !== 'price_kept' && flag !== 'price_at_floor');
      Object.assign(next, {
        priceMode: 'manual',
        retailPrice: toMoneyText(text),
        replacesPrice: null,
        marginPct: null,
        flags,
        edited: true,
      });
    }
  }
  if (body.pricing === 'rule') {
    // The rule over a typed price: the row remembers the price it shows, so the apply replaces only that one.
    Object.assign(next, {
      priceMode: 'rule',
      retailPrice: item.rulePrice,
      replacesPrice: item.existingPrice,
      marginPct: margin('rule'),
      edited: true,
    });
  } else if (body.pricing === 'keep') {
    if (item.existingPrice === null)
      problems.push({ field: 'pricing', message: 'This service has no price to keep.' });
    else
      Object.assign(next, {
        priceMode: 'keep',
        retailPrice: item.existingPrice,
        replacesPrice: null,
        marginPct: margin('keep'),
        edited: true,
      });
  } else if (body.pricing !== undefined)
    problems.push({ field: 'pricing', message: 'Choose the rule or keep the price.' });
}

/** The row after the edit, or the problems the server would answer with (422, a message per field). */
export function editItem(
  item: PublishItem,
  body: Record<string, unknown>,
  ctx: EditContext,
): PublishItem | Problem[] {
  const keys = Object.keys(body);
  if (keys.length === 0) return [{ field: 'body', message: 'Send at least one field to change.' }];
  if ('reset' in body) {
    if (body.reset !== true || keys.length > 1)
      return [{ field: 'reset', message: 'Reset goes alone, with no other key.' }];
    const seed = ctx.seed;
    const { title, slug, brand, carrier, country } = item.detected;
    return {
      ...item,
      title,
      slug,
      brand,
      carrier,
      country,
      edited: false,
      replacesPrice: null,
      priceMode: seed?.priceMode ?? item.priceMode,
      retailPrice: seed?.retailPrice ?? item.retailPrice,
      marginPct: seed?.marginPct ?? item.marginPct,
      flags: seed?.flags ?? item.flags,
      state: seed?.state ?? item.state,
      blockedReason: seed?.blockedReason ?? item.blockedReason,
      included: seed?.included ?? item.included,
    };
  }
  if ('retailPrice' in body && 'pricing' in body)
    return [{ field: 'retailPrice', message: 'Send a price or a pricing choice, not both.' }];
  const problems: Problem[] = [];
  const next: PublishItem = { ...item };
  readFacts(body, next, ctx, problems);
  readPrice(body, item, next, ctx, problems);
  if (body.included !== undefined && typeof body.included !== 'boolean')
    problems.push({ field: 'included', message: 'Send true or false.' });
  if (problems.length > 0) return problems;
  const tick = typeof body.included === 'boolean' ? body.included : undefined;
  const after = reevaluate(next, item, tick);
  if (tick === true && after.state === 'blocked' && after.blockedReason) {
    return [{ field: 'included', message: `Cannot publish: ${BLOCK_WORDS[after.blockedReason]}.` }];
  }
  return tick === undefined ? after : { ...after, included: after.state === 'blocked' ? false : tick };
}
