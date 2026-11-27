// Helpers shared by the tests of the API part and its dialogs: open an account on its API part and find a row of the keys table. Import them
// from tests only; the test file calls `setupMockApi()` and `installAccountMocks()` at its top.
import { screen, within } from '@testing-library/react';
import { renderAccount, type RenderOptions } from '../../pages/test-utils';

/** The VIP merchant of the mock seed: three keys (Production, Staging, a revoked one), a rank with an 8% discount. */
export const ZAIN = /Zain Mobile Hub/;

/** Opens an account (Zain by default) on its API part, as the Owner unless the options say another role. */
export const openApi = (options: RenderOptions = {}, id = 1, name: string | RegExp = ZAIN) =>
  renderAccount(id, name, { ...options, tab: 'api' });

/**
 * The ISO time of noon on a calendar day (month 1 to 12) in the machine's own time zone. A fixture such as `2999-06-15T12:00:00.000Z` reads as
 * the next or the previous day in a zone 12 hours or more from UTC, and the list and the date box print the day in the local zone.
 */
export const noonOf = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).toISOString();

/** The row of a table that holds some text, once the table has loaded. */
export async function rowOf(table: string, text: string | RegExp) {
  const rows = within(await screen.findByRole('table', { name: table }, { timeout: 10_000 }));
  const row = (await rows.findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${String(text)}".`);
  return within(row);
}
