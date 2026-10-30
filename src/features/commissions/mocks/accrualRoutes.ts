// Mock of the accrual routes (`/admin/commission-accruals*`): the list with its status, agent and date filters, one accrual, and the bulk
// approval. The approval marks each ready accrual approved, posts one ledger journal per agent and answers with what it paid and the
// accruals it skipped (unknown, or not ready any more), so the page has a partial result to show. Real rules are the server's.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { round, toAmount } from '@/lib/format';
import { toMoney } from '@/mocks/seed';
import { toAccrual } from './dto';
import { bodyOf, idOf, invalid, listAnswer, notFound, signedIn } from './http';
import { postCommissionJournal } from './ledger';
import { commissionsStore } from './store';
import type { MockAccrual } from './types';

/** The accrual routes. */
export const accrualRoutes: HttpHandler[] = [
  http.get('*/admin/commission-accruals', ({ request }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      return listAnswer(
        stores.accruals.list().map((row) => toAccrual(row, stores)),
        request,
        ['period'],
      );
    }),
  ),

  http.get('*/admin/commission-accruals/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      const row = stores.accruals.find(String(params.id));
      return row ? HttpResponse.json(toAccrual(row, stores)) : notFound('accrual', params.id);
    }),
  ),

  http.post('*/admin/commission-accruals/approve', ({ request }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      const { ids } = await bodyOf(request);
      const wanted = Array.isArray(ids) ? [...new Set(ids.map(idOf))] : [];
      if (wanted.length === 0 || wanted.includes(null)) {
        return invalid([{ field: 'ids', message: 'Choose at least one accrual.' }]);
      }
      const skipped: { id: number; reason: string }[] = [];
      const ready: MockAccrual[] = [];
      for (const id of wanted as number[]) {
        const row = stores.accruals.find(id);
        if (!row) skipped.push({ id, reason: 'This accrual does not exist.' });
        else if (row.status !== 'accrued') skipped.push({ id, reason: 'Already approved.' });
        else ready.push(row);
      }
      const byAgent = new Map<number, MockAccrual[]>();
      for (const row of ready)
        byAgent.set(row.beneficiaryId, [...(byAgent.get(row.beneficiaryId) ?? []), row]);
      let total = 0;
      for (const [agentId, rows] of byAgent) {
        const amount = round(
          rows.reduce((sum, row) => sum + toAmount(row.amount), 0),
          4,
        );
        total += amount;
        const agent = stores.merchants.get(agentId) ?? {
          id: agentId,
          name: `Merchant ${agentId}`,
          country: '',
        };
        const ledgerTxId = await postCommissionJournal(agent, rows, amount);
        const now = new Date().toISOString();
        for (const row of rows) {
          stores.accruals.patch(row.id, { status: 'approved', ledgerTxId, updatedAt: now });
        }
      }
      return HttpResponse.json({ approved: ready.length, total: toMoney(round(total, 4)), skipped });
    }),
  ),
];
