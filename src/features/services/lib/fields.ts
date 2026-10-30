// The Fields dialog's form rows and how they become a service's custom fields. A select field's choices are one comma-separated
// line in the form and a list in the request. The checks are hints; the server validates the fields for real.
import { choicesText, parseChoices } from './options';
import type { ServiceField, ServiceFieldType } from '../types';

/** One field as the form holds it: every value is the text or the switch of its input. */
export type FieldDraft = {
  key: string;
  label: string;
  fieldType: ServiceFieldType;
  required: boolean;
  choices: string;
  regex: string;
  supplierKey: string;
};

/** The whole Fields form: its rows, in order. */
export type FieldsFormValues = { fields: FieldDraft[] };

/** A new empty field. */
export function blankField(): FieldDraft {
  return { key: '', label: '', fieldType: 'text', required: false, choices: '', regex: '', supplierKey: '' };
}

/** A saved field as the form holds it. */
export function fieldDraft(field: ServiceField): FieldDraft {
  return {
    key: field.key,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    choices: choicesText(field.options),
    regex: field.regex,
    supplierKey: field.supplierKey,
  };
}

/** The request entry for a row. Only a choice list keeps its choices. */
export function toServiceField(draft: FieldDraft): ServiceField {
  return {
    key: draft.key.trim(),
    label: draft.label.trim(),
    fieldType: draft.fieldType,
    required: draft.required,
    options: draft.fieldType === 'select' ? parseChoices(draft.choices) : [],
    regex: draft.regex.trim(),
    supplierKey: draft.supplierKey.trim(),
  };
}

/** The index of the first row whose key repeats an earlier row's, or -1. Keys name the field in the order, so they must differ. */
export function repeatedKeyIndex(drafts: readonly FieldDraft[]): number {
  const seen = new Set<string>();
  for (const [index, draft] of drafts.entries()) {
    const key = draft.key.trim();
    if (key === '') continue;
    if (seen.has(key)) return index;
    seen.add(key);
  }
  return -1;
}

// The inputs of a row that have an error line under them. The choices input is not here: it exists only on a choice list.
const ROW_INPUTS = ['key', 'label', 'fieldType', 'required', 'regex', 'supplierKey'] as const;

/**
 * Where a server message about the rows can be shown: the names of the inputs that have an error line under them (every input of every
 * row; the choices only on a choice list), and the API's name for the choices (`options`) mapped to the form's. A message about
 * anything else (the list itself, a column the row has no input for) is left for the dialog's error slot, instead of being set on a
 * name nobody can see.
 */
export function fieldErrorTargets(drafts: readonly FieldDraft[]): {
  names: string[];
  aliases: Record<string, string>;
} {
  const names: string[] = [];
  const aliases: Record<string, string> = {};
  drafts.forEach((draft, index) => {
    const row = `fields.${index}`;
    names.push(...ROW_INPUTS.map((input) => `${row}.${input}`));
    if (draft.fieldType === 'select') {
      names.push(`${row}.choices`);
      aliases[`${row}.options`] = `${row}.choices`;
    }
  });
  return { names, aliases };
}
