// What the listing mock accepts in a body: the content fields of `POST` and `PATCH /admin/service-listings`, checked with the
// server's limits and answered with its field messages (the mock plays the server for these, nothing more).
import { rawTextOf, textOf } from './http';
import type { MockListing } from './types';

/** One refusal of a field. */
export type FieldProblem = { field: string; message: string };

/** The short one-line fields with their limits: `[key, limit]`. */
const ONE_LINE: readonly (readonly [keyof MockListing, number])[] = [
  ['summary', 300],
  ['etaText', 80],
  ['brand', 80],
  ['carrier', 80],
  ['seoTitle', 200],
  ['seoDescription', 400],
];

/** The two Markdown bodies with their limits. */
const MARKDOWN: readonly (readonly [keyof MockListing, number])[] = [
  ['descriptionMd', 20_000],
  ['requirementsMd', 10_000],
];

/** A slug as the server wants it: lower-case words joined by hyphens. */
const SLUG_FORM = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Reads the content fields of a body into `changes` (only the keys the body holds) and collects what the server would refuse.
 * The title and the slug are checked here too; a slug already used is the route's to refuse (it needs the rows).
 */
export function readContent(body: Record<string, unknown>, problems: FieldProblem[]): Partial<MockListing> {
  const changes: Record<string, unknown> = {};
  if ('publicTitle' in body) {
    const title = textOf(body.publicTitle);
    if (!title) problems.push({ field: 'publicTitle', message: 'Enter the title customers see.' });
    else if (title.length > 200)
      problems.push({ field: 'publicTitle', message: 'Use at most 200 characters.' });
    else changes.publicTitle = title;
  }
  if ('slug' in body) {
    const slug = textOf(body.slug);
    if (!SLUG_FORM.test(slug) || slug.length > 120)
      problems.push({
        field: 'slug',
        message: 'Use lower-case words joined by hyphens, up to 120 characters.',
      });
    else changes.slug = slug;
  }
  for (const [key, limit] of ONE_LINE) {
    if (!(key in body)) continue;
    const text = textOf(body[key]);
    if (text.length > limit) problems.push({ field: key, message: `Use at most ${limit} characters.` });
    // eslint-disable-next-line no-control-regex -- the rule refuses control characters, as the server does
    else if (/[\u0000-\u001f\u007f]/.test(text))
      problems.push({ field: key, message: 'Use one line, without line breaks or tabs.' });
    else changes[key] = text;
  }
  for (const [key, limit] of MARKDOWN) {
    if (!(key in body)) continue;
    const text = rawTextOf(body[key]);
    if (text.length > limit) problems.push({ field: key, message: `Use at most ${limit} characters.` });
    else changes[key] = text;
  }
  if ('country' in body) {
    const country = textOf(body.country);
    if (/^([A-Za-z]{2})?$/.test(country)) changes.country = country.toUpperCase();
    else
      problems.push({
        field: 'country',
        message: 'Use a two-letter country code like GB, or leave it empty.',
      });
  }
  if ('isFeatured' in body) {
    if (typeof body.isFeatured === 'boolean') changes.isFeatured = body.isFeatured;
    else problems.push({ field: 'isFeatured', message: 'Choose yes or no.' });
  }
  if ('sort' in body) {
    const sort = body.sort;
    if (typeof sort === 'number' && Number.isInteger(sort) && sort >= 0 && sort <= 1_000_000)
      changes.sort = sort;
    else problems.push({ field: 'sort', message: 'Enter a whole number from 0 to 1000000.' });
  }
  return changes as Partial<MockListing>;
}
