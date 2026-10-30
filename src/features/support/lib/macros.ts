// Reply templates ("macros") with order variables. Ports the `tk-macro` bind of 49-p-support.js, which filled `{name}`, `{order}`
// and `{eta}`. The API's templates use `{{name}}` (assumed contract); only the three documented variables are filled and any
// other stays visible, so a typo is seen in the draft instead of being sent as an empty gap.
import { ageText } from '@/lib/format';
import type { ReplyTemplate, TicketCategory } from '../types';

export type TemplateVariable = { name: 'name' | 'order' | 'eta'; meaning: string };

/** The variables a template may use and what each stands for. */
export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  { name: 'name', meaning: 'the customer’s first name' },
  { name: 'order', meaning: 'the ticket’s order number' },
  { name: 'eta', meaning: 'the usual time for the order’s service' },
];

export type TemplateValues = Record<TemplateVariable['name'], string>;

/** What a variable becomes when the ticket has no order (the demo's wording). */
export const NO_ORDER_VALUES = { order: 'your order', eta: 'a few hours' } as const;

const VARIABLE = /\{\{\s*([A-Za-z_][\w.]*)\s*\}\}/g;

const isKnown = (name: string): name is TemplateVariable['name'] =>
  TEMPLATE_VARIABLES.some((variable) => variable.name === name);

/** Puts the documented variables into the text. An unknown variable stays as it is. */
export function fillTemplate(body: string, values: TemplateValues): string {
  return body.replace(VARIABLE, (whole, name: string) => (isKnown(name) ? values[name] : whole));
}

/** The variables in the text that are not documented, once each, in the order they appear. */
export function unknownVariables(body: string): string[] {
  const names = [...body.matchAll(VARIABLE)].map((match) => match[1]);
  return [...new Set(names.filter((name) => !isKnown(name)))];
}

/** The sample values the template preview fills in. */
export const SAMPLE_VALUES: TemplateValues = {
  name: 'Alex',
  order: 'SF-20490',
  eta: '2h',
};

/** The values of one ticket: the customer's first name, the order number, and the service's usual time. */
export function ticketValues(
  name: string,
  order: { label: string; slaMinutes: number } | null,
): TemplateValues {
  return {
    name,
    order: order ? order.label : NO_ORDER_VALUES.order,
    eta: order ? ageText(order.slaMinutes * 60_000) : NO_ORDER_VALUES.eta,
  };
}

/**
 * The templates that fit a ticket: its own category and the how-to ones (the demo's filter). A ticket without a category
 * sees them all.
 */
export function templatesFor(
  templates: readonly ReplyTemplate[],
  category: TicketCategory | null,
): ReplyTemplate[] {
  if (!category) return [...templates];
  return templates.filter((template) => template.category === category || template.category === 'howto');
}
