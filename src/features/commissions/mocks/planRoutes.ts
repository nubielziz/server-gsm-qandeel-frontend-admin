// Mock of the plan routes (`/admin/commission-plans*`). The mock keeps the demo's rule that a rate is between 0.5 and 15, and refuses to
// delete a plan that agents are still assigned to, so the dialogs have a server answer to show. Real rules are the server's.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { JsonObject } from '@/lib/api';
import type { CommissionPlan } from '../types';
import { bodyOf, conflict, invalid, listAnswer, noContent, notFound, signedIn, textOf } from './http';
import { commissionsStore } from './store';

const KINDS = ['referral', 'rebate'];

type Problems = { field: string; message: string }[];

/** Applies the fields of a body to a plan, collecting the problems. */
function applyFields(row: CommissionPlan, body: Record<string, unknown>, problems: Problems): CommissionPlan {
  const draft = { ...row };
  if ('name' in body) {
    draft.name = textOf(body.name);
    if (!draft.name) problems.push({ field: 'name', message: 'Enter a name.' });
  }
  if ('kind' in body) {
    if (typeof body.kind === 'string' && KINDS.includes(body.kind))
      draft.kind = body.kind as CommissionPlan['kind'];
    else problems.push({ field: 'kind', message: 'Choose referral or rebate.' });
  }
  if ('percent' in body) {
    const text = textOf(body.percent) || (typeof body.percent === 'number' ? String(body.percent) : '');
    const value = Number(text);
    if (text !== '' && Number.isFinite(value) && value >= 0.5 && value <= 15) {
      draft.percent = value.toFixed(4);
    } else problems.push({ field: 'percent', message: 'Enter a rate between 0.5 and 15.' });
  }
  for (const field of ['basis', 'period'] as const) {
    if (field in body) {
      draft[field] = textOf(body[field]);
      if (!draft[field])
        problems.push({ field, message: `Enter the ${field === 'basis' ? 'basis' : 'period'}.` });
    }
  }
  if ('tiers' in body) {
    const tiers = body.tiers;
    if (typeof tiers === 'object' && tiers !== null && !Array.isArray(tiers))
      draft.tiers = tiers as JsonObject;
    else problems.push({ field: 'tiers', message: 'Conditions must be an object.' });
  }
  if ('isActive' in body) draft.isActive = body.isActive === true;
  return draft;
}

/** The plan routes. */
export const planRoutes: HttpHandler[] = [
  http.get('*/admin/commission-plans', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await commissionsStore()).plans.list(), request, ['name', 'basis']),
    ),
  ),

  http.get('*/admin/commission-plans/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await commissionsStore()).plans.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('plan', params.id);
    }),
  ),

  http.post('*/admin/commission-plans', ({ request }) =>
    signedIn(request, async () => {
      const { plans } = await commissionsStore();
      const body = await bodyOf(request);
      const problems: Problems = [];
      const now = new Date().toISOString();
      const draft = applyFields(
        {
          id: 0,
          name: '',
          kind: 'referral',
          basis: '',
          percent: '0.0000',
          tiers: {},
          period: '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        body,
        problems,
      );
      for (const field of ['name', 'kind', 'percent', 'basis', 'period']) {
        if (!(field in body)) problems.push({ field, message: 'This field is required.' });
      }
      if (problems.length > 0) return invalid(problems);
      const { id: _id, ...fields } = draft;
      return HttpResponse.json(plans.insert(fields), { status: 201 });
    }),
  ),

  http.patch('*/admin/commission-plans/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { plans } = await commissionsStore();
      const row = plans.find(String(params.id));
      if (!row) return notFound('plan', params.id);
      const problems: Problems = [];
      const draft = applyFields(row, await bodyOf(request), problems);
      if (problems.length > 0) return invalid(problems);
      const { id: _id, ...changes } = draft;
      return HttpResponse.json(
        plans.patch(row.id, { ...changes, updatedAt: new Date().toISOString() }) ?? row,
      );
    }),
  ),

  http.delete('*/admin/commission-plans/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { plans, assignments } = await commissionsStore();
      const row = plans.find(String(params.id));
      if (!row) return notFound('plan', params.id);
      const used = assignments.list().filter((assignment) => assignment.planId === row.id).length;
      if (used > 0) {
        return conflict(
          'PLAN_IN_USE',
          'Plan in use',
          `The ${row.name} plan is assigned to ${used} ${used === 1 ? 'agent' : 'agents'}. End or move those assignments first.`,
        );
      }
      plans.remove(row.id);
      return noContent();
    }),
  ),
];
