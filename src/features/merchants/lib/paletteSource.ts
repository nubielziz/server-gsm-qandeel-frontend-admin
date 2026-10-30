// The command palette's merchant search: type a name or an email and get up to five merchants, each opening its page. Ports the
// merchants part of paletteItems(q) in 90-app.js; the server does the matching (`q` on `GET /admin/clients`) instead of the
// browser scanning every merchant.
import type { PaletteSource } from '@/app/palette';
import { listClients } from '../api/clients';
import { merchantPath } from './paths';

/** Most merchants the palette lists (the demo's limit for each kind of record). */
export const PALETTE_MERCHANT_LIMIT = 5;

export const merchantsPaletteSource: PaletteSource = {
  id: 'merchants',
  group: 'Merchants',
  permission: 'clients:read',
  async search(query, signal, go) {
    const { data } = await listClients(
      { q: query.trim(), start: 0, end: PALETTE_MERCHANT_LIMIT, sort: ['name'], order: ['asc'] },
      { signal },
    );
    return data.map((client) => ({
      id: `merchant:${client.id}`,
      label: client.name,
      hint: client.email,
      icon: 'users' as const,
      run: () => go(merchantPath(client.id)),
    }));
  },
};
