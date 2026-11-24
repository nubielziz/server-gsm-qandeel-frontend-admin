// Helpers shared by the tests of the Prices part and its dialogs: open an account on its Prices part and find a row of the fixed-price table.
// Import them from tests only; the test file calls `setupMockApi()` and `installAccountMocks()` at its top.
import { screen, within } from '@testing-library/react';
import { renderAccount, type RenderOptions } from '../../pages/test-utils';

/** The VIP merchant of the mock seed: a rank with an 8% discount and one fixed price (iCloud Clean / Lost Check). */
export const ZAIN = /Zain Mobile Hub/;

/** Opens an account (Zain by default) on its Prices part, as the Owner unless the options say another role. */
export const openPrices = (options: RenderOptions = {}, id = 1, name: string | RegExp = ZAIN) =>
  renderAccount(id, name, { ...options, tab: 'prices' });

/** The row of a table that holds some text, once the table has loaded. */
export async function rowOf(table: string, text: string | RegExp) {
  const rows = within(await screen.findByRole('table', { name: table }, { timeout: 10_000 }));
  const row = (await rows.findByText(text)).closest('tr');
  if (!row) throw new Error(`No row of "${table}" holds "${String(text)}".`);
  return within(row);
}

/** One fixed price as the server sends it, for a test that stubs the list. */
export function fixedPrice(id: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    serviceId: 100 + id,
    clientId: 1,
    price: '1.0000',
    note: '',
    createdAt: new Date().toISOString(),
    service: { id: 100 + id, name: `Service ${id}`, type: 'imei', basePrice: '2.0000', floorPrice: '0.5000' },
    groupPrice: '1.8400',
    ...extra,
  };
}
