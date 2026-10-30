// The command palette's customer search: type a name or an email and get up to four customers, each opening its page. Ports
// the customers part of paletteItems(q) in 90-app.js; the server does the matching (`q` on `GET /admin/customers`) instead of
// the browser scanning every customer.
import type { PaletteSource } from '@/app/palette';
import { listCustomers } from '../api';
import { countryName } from './countries';
import { customerPath } from './detailTabs';

/** Most customers the palette lists (the demo's limit). */
export const PALETTE_CUSTOMER_LIMIT = 4;

export const customersPaletteSource: PaletteSource = {
  id: 'customers',
  group: 'Customers',
  permission: 'customers:read',
  async search(query, signal, go) {
    // No sort on purpose: the first matches in the server's own order, as in the demo.
    const { data } = await listCustomers(
      { q: query.trim(), start: 0, end: PALETTE_CUSTOMER_LIMIT },
      { signal },
    );
    return data.map((customer) => ({
      id: `customer:${customer.id}`,
      label: customer.name,
      hint: countryName(customer.country),
      icon: 'user' as const,
      run: () => go(customerPath(customer.id)),
    }));
  },
};
