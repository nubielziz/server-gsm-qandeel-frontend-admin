// The Custom Fields section's form rows (the edit view's Field part) and how they become a service's custom fields. A select field's choices are one comma-separated
// line in the form and a list in the request. A saved field's hidden key and hidden pattern travel through the form untouched. The checks
// are hints; the server validates the fields for real.
import { choicesText, parseChoices } from './options';
import type { ServiceField, ServiceFieldInput, ServiceFieldType } from '../types';

/**
 * One field as the form holds it: every value is the text or the switch of its input. `key` is the hidden identifier of a saved field
 * (`''` for a new row, which the server gives one from its name); it has no input and is sent back untouched. `regex` is the same: the
 * answer pattern a supplier import made for a saved field (`''` for a new row); nobody types it and it is sent back untouched
 * (decision 030). `isMainInput` is not registered as an input of its own: the tick box of the "Main input" column shows it and changes it through `withMainInput`.
 */
export type FieldDraft = {
  key: string;
  name: string;
  label: string;
  fieldType: ServiceFieldType;
  required: boolean;
  choices: string;
  regex: string;
  isMainInput: boolean;
};

/** The whole Fields form: its rows, in order. */
export type FieldsFormValues = { fields: FieldDraft[] };

/** A new empty field. */
export function blankField(): FieldDraft {
  return {
    key: '',
    name: '',
    label: '',
    fieldType: 'text',
    required: false,
    choices: '',
    regex: '',
    isMainInput: false,
  };
}

/** A saved field as the form holds it. */
export function fieldDraft(field: ServiceField): FieldDraft {
  return {
    key: field.key,
    name: field.name,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    choices: choicesText(field.options),
    regex: field.regex,
    isMainInput: field.isMainInput,
  };
}

/**
 * The request entry for a row. Only a choice list keeps its choices. A new row has no `key` (the server makes it); the label goes as
 * typed while the Label column is shown (`showLabel`, the default), so an empty label asks the server to store the name. While the column
 * is hidden (decision 035) every row sends an empty label: the server stores the name, and a renamed field's label follows its name.
 * The pattern goes exactly as the saved field had it (`''` for a new row): no input changes it, so it is not trimmed either.
 */
export function toServiceField(draft: FieldDraft, showLabel = true): ServiceFieldInput {
  const key = draft.key.trim();
  return {
    ...(key === '' ? {} : { key }),
    name: draft.name.trim(),
    label: showLabel ? draft.label.trim() : '',
    fieldType: draft.fieldType,
    required: draft.required,
    options: draft.fieldType === 'select' ? parseChoices(draft.choices) : [],
    regex: draft.regex,
    isMainInput: draft.isMainInput,
  };
}

/** True when a label says something other than its name (surrounding spaces ignored); an empty label means "the name". */
function labelDiffers(label: string, name: string): boolean {
  const text = label.trim();
  return text !== '' && text !== name.trim();
}

/**
 * Whether any saved field has a label that differs from its name: the "Show buyers a different label" tick box starts ticked then, so a
 * label that exists is never out of sight (decision 035).
 */
export function hasDifferentLabel(fields: readonly Pick<ServiceField, 'name' | 'label'>[]): boolean {
  return fields.some((field) => labelDiffers(field.label, field.name));
}

/**
 * Whether the rows hold a label that a save with the Label column hidden would clear (a label that differs from its name). The form
 * counts that as a change of its own, so unticking the box on a service with different labels can be saved.
 */
export function hasLabelToClear(drafts: readonly FieldDraft[]): boolean {
  return drafts.some((draft) => labelDiffers(draft.label, draft.name));
}

/**
 * The index of the first row whose name repeats an earlier row's, or -1. A name is what the supplier receives and must be unique in the
 * service whatever the letter case ("Email" and "email" are the same name); spaces around it do not count.
 */
export function repeatedNameIndex(drafts: readonly FieldDraft[]): number {
  const seen = new Set<string>();
  for (const [index, draft] of drafts.entries()) {
    const name = draft.name.trim().toLowerCase();
    if (name === '') continue;
    if (seen.has(name)) return index;
    seen.add(name);
  }
  return -1;
}

/**
 * The rows after the main input of row `index` is switched on or off. A service has at most one main input, so switching one on
 * switches the others off; switching it off leaves every row without one.
 */
export function withMainInput(drafts: readonly FieldDraft[], index: number, on: boolean): FieldDraft[] {
  return drafts.map((draft, row) => {
    if (row === index) return { ...draft, isMainInput: on };
    return on ? { ...draft, isMainInput: false } : draft;
  });
}

// The inputs of a row that have an error line under them. The choices input is not here: it exists only on a choice list.
const ROW_INPUTS = ['name', 'label', 'fieldType', 'required', 'isMainInput'] as const;

/**
 * Where a server message about the rows can be shown: the names of the inputs that have an error line under them (every input of every
 * row; the choices only on a choice list), and the API's names mapped to the form's: the choices (`options`) to the choices input,
 * and the hidden key (a field that no longer exists) and the hidden pattern to the row's name input, the only visible cell they are about.
 * The main-input flag (a second main input) has its own tick box and its own error line. A message about anything else (the list itself, a column the row has no input for) is left for the
 * dialog's error slot, instead of being set on a name nobody can see.
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
    aliases[`${row}.key`] = `${row}.name`;
    aliases[`${row}.regex`] = `${row}.name`;
    if (draft.fieldType === 'select') {
      names.push(`${row}.choices`);
      aliases[`${row}.options`] = `${row}.choices`;
    }
  });
  return { names, aliases };
}
