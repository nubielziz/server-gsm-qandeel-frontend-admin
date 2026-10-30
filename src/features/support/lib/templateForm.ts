// The values of the template form and what to send when a template is edited. Only the fields that changed are sent, and
// nothing at all when none did (the same rule as the customers' edit dialog).
import type { ReplyTemplate, TicketCategory, UpdateTemplateBody } from '../types';

/** What the form holds. */
export type TemplateFormValues = {
  title: string;
  category: TicketCategory;
  locale: string;
  shortcut: string;
  body: string;
};

/** The form's values with the text fields trimmed, as they are sent. */
export function cleanTemplate(values: TemplateFormValues): TemplateFormValues {
  return {
    title: values.title.trim(),
    category: values.category,
    locale: values.locale,
    shortcut: values.shortcut.trim(),
    body: values.body.trim(),
  };
}

/** The fields of the form that differ from the template, trimmed; empty when nothing changed. */
export function changedTemplateFields(
  template: ReplyTemplate,
  values: TemplateFormValues,
): UpdateTemplateBody {
  const next = cleanTemplate(values);
  const changed: UpdateTemplateBody = {};
  if (next.title !== template.title) changed.title = next.title;
  if (next.category !== template.category) changed.category = next.category;
  if (next.locale !== template.locale) changed.locale = next.locale;
  if (next.shortcut !== template.shortcut) changed.shortcut = next.shortcut;
  if (next.body !== template.body) changed.body = next.body;
  return changed;
}
