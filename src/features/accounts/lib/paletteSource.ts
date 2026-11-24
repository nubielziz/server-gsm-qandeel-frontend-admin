// The command palette's account search: type a name, an email, a company or a username and get up to six accounts, each opening its
// record. One source for every rank; the server does the matching (`q` on `GET /admin/clients`) instead of the browser
// scanning every account. Ports the merchants and customers parts of paletteItems(q) in 90-app.js.
import type { PaletteSource } from '@/app/palette';
import { accountLabel } from '@/lib/format';
import { listAccounts } from '../api/accounts';
import { accountPath } from './paths';

/** Most accounts the palette lists. */
export const PALETTE_ACCOUNT_LIMIT = 6;

export const accountsPaletteSource: PaletteSource = {
  id: 'accounts',
  group: 'Accounts',
  permission: 'clients:read',
  async search(query, signal, go) {
    // No sort on purpose beyond the name: the first matches in a stable order.
    const { data } = await listAccounts(
      { q: query.trim(), start: 0, end: PALETTE_ACCOUNT_LIMIT, sort: ['name'], order: ['asc'] },
      { signal },
    );
    return data.map((account) => ({
      id: `account:${account.id}`,
      label: accountLabel(account),
      hint: account.name.trim() ? `${account.rank.name} · ${account.email}` : account.rank.name,
      icon: 'users' as const,
      run: () => go(accountPath(account.id)),
    }));
  },
};
