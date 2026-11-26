// The text forms of the Custom Fields section of the edit view's Field part: a select field's choices as one comma-separated line, and the
// menu of field types.
import type { SelectOption } from '@/components/ui';
import type { ServiceFieldType } from '../types';

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

/** The kinds of custom field and the words that name them. The menu is the same for every service type (decision 031). */
export const FIELD_TYPE_OPTIONS: readonly (SelectOption & { value: ServiceFieldType })[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Choice list' },
  { value: 'textarea', label: 'Long text' },
  { value: 'imei', label: 'IMEI (15 digits)' },
];
