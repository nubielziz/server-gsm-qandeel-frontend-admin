// Test helpers for CountryField: a test chooses a country the way a person does (open the list, take a row), since the field is a button
// with a panel, not a native select. Only tests import this file.
import type { UserEvent } from '@testing-library/user-event';

/** Opens the field's list and returns the list box. */
async function openList(user: UserEvent, field: HTMLElement): Promise<HTMLElement> {
  if (field.getAttribute('aria-expanded') !== 'true') await user.click(field);
  const list = document.getElementById(field.getAttribute('aria-controls') ?? '');
  if (!list) throw new Error('The country field did not open its list.');
  return list;
}

/**
 * Chooses a country in a CountryField.
 *
 * @param field the field's button (`getByRole('combobox', { name: 'Country' })`)
 * @param code the two-letter code of the row, or '' for the choice that means "none" ("Any country", "Choose a country")
 */
export async function chooseCountry(user: UserEvent, field: HTMLElement, code: string): Promise<void> {
  const list = await openList(user, field);
  const row = list.querySelector<HTMLElement>(`[data-code="${code}"]`);
  if (!row) throw new Error(`The country list has no row for "${code}".`);
  await user.click(row);
}

/** The texts of the rows a CountryField offers, in order. Opens the list, reads it and closes it again. */
export async function countryRowTexts(user: UserEvent, field: HTMLElement): Promise<string[]> {
  const list = await openList(user, field);
  const texts = Array.from(list.querySelectorAll('[role="option"]'), (row) => row.textContent ?? '');
  await user.keyboard('{Escape}');
  return texts;
}
