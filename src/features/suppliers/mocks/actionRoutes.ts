// Mock routes of the two supplier actions: `POST /admin/suppliers/:id/test` and `POST /admin/suppliers/:id/sync`. A healthy
// supplier passes the test; a degraded or down one answers with the failure text. A sync is refused for a disabled or down
// supplier, with the wording of the demo. Both add a call to the API log (decision 014: simple fakes, no server rules).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { notFound } from '@/mocks/handlers/accessShared';
import { problem } from '@/mocks/problem';
import { secured } from './secured';
import { addCall } from './store';

// What a failed `accountinfo` call looks like for a supplier that is not healthy.
const FAILURE = {
  degraded: { code: 504, text: 'gateway timeout', ms: 8400 },
  down: { code: 503, text: 'service unavailable', ms: 9200 },
} as const;

/** The routes for Test connection and Sync now. */
export const actionHandlers: HttpHandler[] = [
  http.post(
    '*/admin/suppliers/:id/test',
    secured(async ({ params, data }) => {
      const row = data.suppliers.find(String(params.id));
      if (!row) return notFound('supplier', params.id);
      if (row.health === 'up') {
        addCall(data, { supplierId: row.id, action: 'accountinfo', code: 200, ms: row.p50Ms ?? 300 });
        return HttpResponse.json({
          ok: true,
          message: 'Authenticated.',
          httpStatus: 200,
          durationMs: row.p50Ms ?? 300,
          accountName: 'GSM Supply',
          balance: row.balance,
        });
      }
      const failure = FAILURE[row.health];
      const message = `accountinfo returned ${failure.code} (${failure.text}). Orders sent now may stop for review.`;
      addCall(data, {
        supplierId: row.id,
        action: 'accountinfo',
        code: failure.code,
        ms: failure.ms,
        message,
      });
      return HttpResponse.json({ ok: false, message, httpStatus: failure.code, durationMs: failure.ms });
    }),
  ),

  http.post(
    '*/admin/suppliers/:id/sync',
    secured(async ({ params, data }) => {
      const row = data.suppliers.find(String(params.id));
      if (!row) return notFound('supplier', params.id);
      if (row.status === 'disabled') {
        return problem(
          409,
          'SUPPLIER_DISABLED',
          `${row.name} is disabled`,
          'Enable the supplier before syncing it.',
        );
      }
      if (row.health === 'down') {
        return problem(
          409,
          'SUPPLIER_UNAVAILABLE',
          `Can’t sync while ${row.name} is down`,
          'Try again once it recovers.',
        );
      }
      row.balanceCheckedAt = new Date().toISOString();
      addCall(data, { supplierId: row.id, action: 'imeiservicelist', code: 200, ms: row.p50Ms ?? 400 });
      const items = data.catalogue.list().filter((item) => item.supplierId === row.id);
      const changed = items.filter((item) => item.priceChangedAt !== null).length;
      return HttpResponse.json({
        services: items.length,
        added: 0,
        changed,
        removed: 0,
        balance: row.balance,
        balanceCheckedAt: row.balanceCheckedAt,
      });
    }),
  ),
];
