// Small lookups for the Order form section of the service panel: the words for a field's type and the entries of each option list.
// Pure counts and labels of what the server saved; nothing is worked out here.
import { entriesText, FIELD_TYPE_OPTIONS } from '../../../lib/options';
import { OPTION_LISTS } from '../../../lib/status';
import type { ServiceFieldType, ServiceOption, ServiceOptionList } from '../../../types';

/** The words that name a field's type in the Fields dialog ("Choice list"); an unknown type from the server shows as it came. */
export function fieldTypeLabel(type: ServiceFieldType): string {
  return FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

/** One option list with the number of entries it holds. */
export type OptionListCount = { id: ServiceOptionList; label: string; count: number };

/** The three option lists in the order the Options dialog shows them, each with its entry count (a list with none has 0). */
export function optionListCounts(options: readonly ServiceOption[]): OptionListCount[] {
  return OPTION_LISTS.map(({ id, label }) => ({
    id,
    label,
    count: options.filter((option) => option.list === id).length,
  }));
}

/** What the summary says next to a list: "None" for an empty one, else "3 entries". */
export function listCountText(count: number): string {
  return count === 0 ? 'None' : entriesText(count);
}
