// The Options and Fields dialogs' text forms. An option list is edited as lines of text (a model list can have hundreds
// of entries, which rows of inputs would make slow to edit); a select field's choices are one comma-separated line.
import type { SelectOption } from '@/components/ui';
import type { ServiceFieldType, ServiceOption, ServiceOptionList } from '../types';

/** The separator between an option's value, label and supplier value on one line. */
const SEPARATOR = '|';

/** The options of one list as lines: `value | label | supplier value`. The label and supplier value are left out when empty. */
export function optionLines(options: readonly ServiceOption[], list: ServiceOptionList): string {
  return options
    .filter((option) => option.list === list)
    .map((option) => {
      const parts = [option.value, option.label, option.supplierValue];
      while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
      return parts.join(` ${SEPARATOR} `);
    })
    .join('\n');
}

/**
 * Reads lines back into options. A line is `value`, `value | label` or `value | label | supplier value`; the label
 * defaults to the value. Blank lines are skipped.
 */
export function parseOptionLines(text: string, list: ServiceOptionList): ServiceOption[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const [value = '', label = '', supplierValue = ''] = line.split(SEPARATOR).map((part) => part.trim());
      return { list, value, label: label || value, supplierValue };
    });
}

/** The 1-based number of the first line that has text but no value (for example `| Label`), or null when every line has one. */
export function blankValueLine(text: string): number | null {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex(
    (line) => line.trim() !== '' && (line.split(SEPARATOR)[0] ?? '').trim() === '',
  );
  return index < 0 ? null : index + 1;
}

/** "12 entries" for the hint under a list. */
export function entriesText(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

/** A select field's choices as one line: `Red, Green, Blue`. */
export function choicesText(choices: readonly string[]): string {
  return choices.join(', ');
}

/** The choices of a select field from the line the form holds. */
export function parseChoices(text: string): string[] {
  return text
    .split(',')
    .map((choice) => choice.trim())
    .filter((choice) => choice !== '');
}

/** The kinds of custom field and the words that name them. */
export const FIELD_TYPE_OPTIONS: readonly (SelectOption & { value: ServiceFieldType })[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Choice list' },
  { value: 'textarea', label: 'Long text' },
];
