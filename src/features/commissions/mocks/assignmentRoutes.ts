// Mock of the assignment routes (`/admin/commission-assignments*`). The mock refuses a merchant or plan that does not exist and a
// merchant that already has a plan (the demo gave a merchant one plan), so the dialogs have a server answer to show.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toAssignment } from './dto';
import { bodyOf, conflict, idOf, invalid, listAnswer, noContent, notFound, signedIn } from './http';
import { commissionsStore } from './store';

const SEARCH_FIELDS = ['scope'];

/** The assignment routes. */
export const assignmentRoutes: HttpHandler[] = [
  http.get('*/admin/commission-assignments', ({ request }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      return listAnswer(
        stores.assignments.list().map((row) => toAssignment(row, stores)),
        request,
        SEARCH_FIELDS,
      );
    }),
  ),

  http.get('*/admin/commission-assignments/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      const row = stores.assignments.find(String(params.id));
      return row ? HttpResponse.json(toAssignment(row, stores)) : notFound('assignment', params.id);
    }),
  ),

  http.post('*/admin/commission-assignments', ({ request }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      const body = await bodyOf(request);
      const beneficiaryId = idOf(body.beneficiaryId);
      const planId = idOf(body.planId);
      const merchant = beneficiaryId === null ? undefined : stores.merchants.get(beneficiaryId);
      const plan = planId === null ? undefined : stores.plans.find(planId);
      const problems = [
        ...(merchant ? [] : [{ field: 'beneficiaryId', message: 'Choose a merchant that exists.' }]),
        ...(plan ? [] : [{ field: 'planId', message: 'Choose a plan that exists.' }]),
      ];
      if (problems.length > 0 || !merchant || !plan) return invalid(problems);
      const current = stores.assignments.list().find((row) => row.beneficiaryId === merchant.id);
      if (current) {
        const was = stores.plans.find(current.planId)?.name ?? 'a plan';
        return conflict(
          'ALREADY_ASSIGNED',
          'Merchant already on a plan',
          `${merchant.name} is already on the ${was} plan. Change its plan instead.`,
        );
      }
      const now = new Date().toISOString();
      const row = stores.assignments.insert({
        planId: plan.id,
        beneficiaryId: merchant.id,
        scope: 'referrals',
        startsAt: now,
        endsAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return HttpResponse.json(toAssignment(row, stores), { status: 201 });
    }),
  ),

  http.patch('*/admin/commission-assignments/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      const row = stores.assignments.find(String(params.id));
      if (!row) return notFound('assignment', params.id);
      const planId = idOf((await bodyOf(request)).planId);
      const plan = planId === null ? undefined : stores.plans.find(planId);
      if (!plan) return invalid([{ field: 'planId', message: 'Choose a plan that exists.' }]);
      const changed = stores.assignments.patch(row.id, {
        planId: plan.id,
        updatedAt: new Date().toISOString(),
      });
      return HttpResponse.json(toAssignment(changed ?? row, stores));
    }),
  ),

  http.delete('*/admin/commission-assignments/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await commissionsStore();
      return stores.assignments.remove(String(params.id)) ? noContent() : notFound('assignment', params.id);
    }),
  ),
];
