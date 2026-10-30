// Mock of the IMEI check log and the blocklist (`/admin/imei-checks*`, `/admin/blocklist*`): list with filters, sort, row
// range and `x-total-count`, one row, and for the blocklist add and remove. The refusals are the obvious ones (a bad or
// duplicate value, no such entry): the real server owns the rules (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { fmtImei } from '@/lib/format';
import { bodyOf, invalid, notFound, readHandlers, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { blockReasonHint, blockValueHint, imeiDigits } from '../lib/blocklist';
import { ADDABLE_KINDS } from '../lib/labels';
import type { AddableBlockKind } from '../types';
import { addBlock } from './decisions';
import { riskState } from './store';

const addable = (kind: string): kind is AddableBlockKind =>
  ADDABLE_KINDS.some((candidate) => candidate === kind);

export const checkHandlers: HttpHandler[] = readHandlers({
  base: '/admin/imei-checks',
  what: 'IMEI check',
  source: async () => ({ rows: (await riskState()).checks.list(), toDto: (row) => row }),
  searchFields: ['imei', 'brand', 'model'],
});

export const blocklistHandlers: HttpHandler[] = [
  ...readHandlers({
    base: '/admin/blocklist',
    what: 'blocklist entry',
    source: async () => ({ rows: (await riskState()).blocklist.list(), toDto: (row) => row }),
    searchFields: ['display', 'reason'],
  }),

  http.post('*/admin/blocklist', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const kind = textOf(body.kind);
    const value = textOf(body.value);
    const reason = textOf(body.reason);
    if (!addable(kind)) return invalid([{ field: 'kind', message: 'Choose what to block.' }]);
    const valueMessage = blockValueHint(kind, value);
    const reasonMessage = blockReasonHint(reason);
    if (valueMessage || reasonMessage) {
      return invalid([
        ...(valueMessage ? [{ field: 'value', message: valueMessage }] : []),
        ...(reasonMessage ? [{ field: 'reason', message: reasonMessage }] : []),
      ]);
    }
    const staff = await currentStaff();
    const entry = addBlock(await riskState(), {
      kind,
      display: kind === 'imei' ? fmtImei(imeiDigits(value)) : value,
      reason,
      createdBy: staff ? { id: staff.id, name: staff.name } : null,
    });
    if (!entry) {
      return problem(409, 'ALREADY_BLOCKED', 'Already blocked', 'That is already on the blocklist.');
    }
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.delete('*/admin/blocklist/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const removed = (await riskState()).blocklist.remove(String(params.id));
    return removed ? new HttpResponse(null, { status: 204 }) : notFound('blocklist entry', params.id);
  }),
];
