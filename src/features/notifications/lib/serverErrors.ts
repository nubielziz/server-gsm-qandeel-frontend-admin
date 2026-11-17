// Places the server's refusal of a save on the composer's fields. The API names a field (`name`, `channels`, `audience.merchants.countries`,
// `content.title`, `link.customer`); a message about a field the composer does not know goes to the drawer's general slot, so nothing is lost.
import { isApiError } from '@/lib/api';
import type { Problems } from './spec';

/** Field names (and prefixes) the composer shows under a control. */
const KNOWN = ['name', 'purpose', 'channels', 'audience', 'content', 'link'] as const;

export type PlacedErrors = {
  /** Messages by field name, as the server wrote them. */
  fields: Problems;
  /** What belongs to no field: shown above the form. */
  rest: string[];
};

/** Splits an error into messages per known field and a list of the rest. A thrown value that is not an ApiError is shown as a general message. */
export function placeErrors(error: unknown): PlacedErrors {
  if (!error) return { fields: {}, rest: [] };
  if (!isApiError(error))
    return { fields: {}, rest: [error instanceof Error ? error.message : 'Something went wrong.'] };
  const fields: Problems = {};
  const rest = [...error.formErrors];
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (KNOWN.some((known) => field === known || field.startsWith(`${known}.`)))
      fields[field] = messages.join(' ');
    else rest.push(`${field}: ${messages.join(' ')}`);
  }
  if (Object.keys(fields).length === 0 && rest.length === 0) rest.push(error.detail ?? error.title);
  return { fields, rest };
}

/** The messages of every field that is `prefix` or starts with `prefix.`, joined; undefined when there is none. */
export function messagesUnder(errors: Problems, prefix: string): string | undefined {
  const found = Object.entries(errors)
    .filter(([field]) => field === prefix || field.startsWith(`${prefix}.`))
    .map(([, message]) => message);
  return found.length > 0 ? [...new Set(found)].join(' ') : undefined;
}

/** Audience fields that have their own place under a control. */
const OWN_PLACE = [
  'audience.include',
  'audience.exclude',
  'audience.merchants.statuses',
  'audience.merchants.countries',
  'audience.customers.countries',
];

/** The audience messages no control shows itself (`audience`, `audience.staff.roleIds`…): the builder prints them under its last row. */
export function audienceLeftovers(errors: Problems): string | undefined {
  const found = Object.entries(errors)
    .filter(
      ([field]) =>
        (field === 'audience' || field.startsWith('audience.')) &&
        !OWN_PLACE.some((own) => field.startsWith(own)),
    )
    .map(([, message]) => message);
  return found.length > 0 ? [...new Set(found)].join(' ') : undefined;
}
