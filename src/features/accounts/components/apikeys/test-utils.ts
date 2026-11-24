// Helpers shared by the tests of the API part and its dialogs: open an account on its API part and find a row of the keys table. Import them
// from tests only; the test file calls `setupMockApi()` and `installAccountMocks()` at its top.
import { screen, within } from '@testing-library/react';
import { renderAccount, type RenderOptions } from '../../pages/test-utils';

/** The VIP merchant of the mock seed: three keys (Production, Staging, a revoked one), a rank with an 8% discount. */
export const ZAIN = /Zain Mobile Hub/;

/** Opens an account (Zain by default) on its API part, as the Owner unless the options say another role. */
export const openApi = (options: RenderOptions = {}, id = 1, name: string | RegExp = ZAIN) =>
  renderAccount(id, name, { ...options, tab: 'api' });

/** The row of a table that holds some text, once the table has loaded. */
export async function rowOf(table: string, text: string | RegExp) {
  const rows = within(await screen.findByRole('table', { name: table }, { timeout: 10_000 }));
  const row = (await rows.findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${String(text)}".`);
  return within(row);
}
