// Mock of `GET /admin/customer-wallets` (the store balances list): every store balance with the state filter, the search over name and
// email, the sort (balance or updated) and the row range. The wallets themselves live in the accounts mock; this only lists them.
// Mocks fake answers only (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { storeBalanceRows } from '@/features/accounts/mocks';
import { applyListQuery } from '@/mocks/crud';
import { latency } from '@/mocks/latency';
import { guard } from '@/mocks/session';
import { walletStateOf } from '../lib/walletView';

export const customerWalletHandlers: HttpHandler[] = [
  http.get('*/admin/customer-wallets', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    // `state` is worked out from the balance and the hold, not a field of the row.
    const params = new URL(request.url).searchParams;
    const states = params.getAll('state');
    const next = new URLSearchParams(params);
    next.delete('state');
    // The default sort of the real route: most recently changed first.
    if (!next.has('_sort')) {
      next.set('_sort', 'updatedAt');
      next.set('_order', 'desc');
    }
    const rows = (await storeBalanceRows()).filter(
      (row) => states.length === 0 || states.includes(walletStateOf(row)),
    );
    const { page, total } = applyListQuery(rows, next, ['customer.name', 'customer.email']);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),
];
