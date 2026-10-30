// Mock routes of the checkouts feature: the abandoned list, the recovery email and the funnel. They fake the answers and keep simple
// state (a checkout that was emailed stays emailed); the refusals are the map's rules (consent, once only, not paid). The real
// server decides everything (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { guard } from '@/mocks/session';
import { FUNNEL_PERIODS, type RecoverCheckoutsResult, type SkippedCheckout } from '../types';
import { buildFunnel } from './funnel';
import { checkoutsState, toDto, type MockCheckout } from './store';

// Why the server leaves a checkout out, in the order it checks.
function skipReason(row: MockCheckout | undefined): string | null {
  if (!row) return 'not_found';
  if (row.recoveryEmailedAt) return 'already_emailed';
  if (row.orderId !== null) return 'already_paid';
  if (!row.marketingConsent) return 'no_marketing_consent';
  return null;
}

export const checkoutHandlers: HttpHandler[] = [
  http.get('*/admin/reports/funnel', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
    if (!FUNNEL_PERIODS.some((period) => period === days)) {
      return invalid([{ field: 'days', message: `Use one of ${FUNNEL_PERIODS.join(', ')}.` }]);
    }
    return HttpResponse.json(await buildFunnel(await checkoutsState(), days));
  }),

  http.post('*/admin/checkouts/recover', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is number => Number.isInteger(id)) : [];
    if (ids.length === 0) return invalid([{ field: 'ids', message: 'Choose at least one checkout.' }]);
    const { checkouts } = await checkoutsState();
    const skipped: SkippedCheckout[] = [];
    let sent = 0;
    for (const id of new Set(ids)) {
      const row = checkouts.find(id);
      const reason = skipReason(row);
      if (reason || !row) {
        skipped.push({ id, reason: reason ?? 'not_found' });
        continue;
      }
      checkouts.patch(id, { recoveryEmailedAt: new Date().toISOString(), canRecover: false });
      sent += 1;
    }
    const result: RecoverCheckoutsResult = { sent, skipped };
    return HttpResponse.json(result);
  }),

  http.get('*/admin/checkouts/abandoned', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const params = new URL(request.url).searchParams;
    // The search looks at the full address, which the rows only carry masked.
    const text = (params.get('q') ?? '').trim().toLowerCase();
    params.delete('q');
    const { checkouts } = await checkoutsState();
    const rows = checkouts
      .list()
      .filter((row) => !text || row.rawEmail.toLowerCase().includes(text))
      .map(toDto);
    const { page, total } = applyListQuery(rows, params);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),
];
