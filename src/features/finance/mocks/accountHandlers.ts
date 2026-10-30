// Mock of the ledger account routes (`GET /admin/ledger/accounts`, `POST /admin/ledger/reconcile`): the trial balance worked
// out from the shared ledger store, and a reconciliation that finds the books in order. Mocks fake answers only (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { latency } from '@/mocks/latency';
import { ledgerStore } from '@/mocks/ledger';
import { guard } from '@/mocks/session';
import type { ReconcileResult } from '../types';
import { trialBalanceOf } from './books';

export const accountHandlers: HttpHandler[] = [
  http.get('*/admin/ledger/accounts', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return HttpResponse.json(await trialBalanceOf());
  }),

  http.post('*/admin/ledger/reconcile', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const entries = (await ledgerStore()).list();
    const result: ReconcileResult = {
      ranAt: new Date().toISOString(),
      accountsChecked: new Set(entries.flatMap((entry) => entry.entries.map((line) => line.account.id))).size,
      entriesChecked: entries.reduce((count, entry) => count + entry.entries.length, 0),
      differences: [],
    };
    return HttpResponse.json(result);
  }),
];
