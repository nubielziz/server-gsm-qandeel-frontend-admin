// The refusals of the mock create and edit routes: the same field rules the server applies (plain text only, `{{name}}` the only placeholder, a title
// and a text, a site path for each link, an audience that targets someone). The mock is the reference behaviour for the UI tests.
import type { ProblemError } from '@/mocks/problem';
import type { AudienceSpec, CampaignInput } from '../types';

const HTML_TAG = /<\/?[A-Za-z][A-Za-z0-9-]*(\s[^<>]*)?\/?>/;
const SITE_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/?#=&%]{0,199}$/;
const PLACEHOLDER = /\{\{\s*([^}]*?)\s*\}\}/g;

function textProblems(field: string, value: string): ProblemError[] {
  const errors: ProblemError[] = [];
  if (value.trim() === '') return [{ field, message: 'Write a text.' }];
  const unknown = [...value.matchAll(PLACEHOLDER)].map((match) => match[1]).filter((name) => name !== 'name');
  if (unknown.length > 0)
    errors.push({
      field,
      message: `Only {{name}} can be used; remove ${unknown.map((n) => `{{${n}}}`).join(', ')}.`,
    });
  if (HTML_TAG.test(value))
    errors.push({ field, message: 'Write plain text; the email layout is added for you.' });
  return errors;
}

// The kinds of person a request may name (decision 023): the words of the old model are refused.
const PERSON_TYPES = new Set<string>(['staff', 'account']);

/** The audience rules that one field cannot say. */
export function audienceProblems(audience: AudienceSpec): ProblemError[] {
  const errors: ProblemError[] = [];
  const include = audience.include ?? [];
  if (!audience.staff && !audience.merchants && !audience.customers && include.length === 0) {
    errors.push({
      field: 'audience',
      message: 'Choose at least one group of people (staff, merchants or retail accounts) or add people.',
    });
  }
  for (const key of ['include', 'exclude'] as const) {
    if ((audience[key] ?? []).some((person) => !PERSON_TYPES.has(person.type))) {
      errors.push({ field: `audience.${key}`, message: 'A person is a staff member or an account.' });
    }
  }
  for (const key of ['merchants', 'customers'] as const) {
    for (const code of audience[key]?.countries ?? []) {
      if (!/^[A-Z]{2}$/.test(code))
        errors.push({
          field: `audience.${key}.countries`,
          message: 'Use an ISO 3166-1 alpha-2 code in capitals, such as JO.',
        });
    }
  }
  return errors;
}

/** Every refusal for a whole campaign (create) or a merged one (edit). An empty list means it is acceptable. */
export function inputProblems(input: CampaignInput): ProblemError[] {
  const errors: ProblemError[] = [];
  if (input.name.trim() === '') errors.push({ field: 'name', message: 'Give the campaign a name.' });
  if (input.channels.length === 0 || new Set(input.channels).size !== input.channels.length) {
    errors.push({ field: 'channels', message: 'Choose one or two different channels.' });
  }
  errors.push(...audienceProblems(input.audience));
  for (const part of ['title', 'body'] as const)
    errors.push(...textProblems(`content.${part}`, input.content[part]));
  for (const key of ['staff', 'merchant', 'customer'] as const) {
    const value = input.link?.[key];
    if (value !== undefined && !SITE_PATH.test(value)) {
      errors.push({
        field: `link.${key}`,
        message: 'Use a path on the site that starts with one /, such as /account/orders.',
      });
    }
  }
  return errors;
}
