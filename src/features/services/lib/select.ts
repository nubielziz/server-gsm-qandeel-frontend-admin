// A small helper for menus whose names load after the form opens or come from a capped list.
import type { SelectOption } from '@/components/ui';

/**
 * The options plus the chosen one when the list does not hold it (the names are still loading, or the choice is beyond the first
 * names the menu loads). A select shows its first option when its value is not among them, so without this a form could show
 * one choice and send another.
 */
export function withChosen(
  options: readonly SelectOption[],
  chosen: string | number | null | undefined,
  label: string,
): SelectOption[] {
  if (chosen === null || chosen === undefined || chosen === '') return [...options];
  if (options.some((option) => String(option.value) === String(chosen))) return [...options];
  return [...options, { value: chosen, label }];
}
