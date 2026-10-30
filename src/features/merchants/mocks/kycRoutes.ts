// Mock of the verification routes (`/admin/kyc-submissions`, `/decide`) and of a merchant's API keys (`/admin/clients/:id/api-keys`,
// `DELETE /admin/api-keys/:id`). A decision also sets the merchant's verification status; one that was already made is refused, and
// so is revoking a key twice, so the dialogs have a server answer to show. The real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { currentStaff } from '@/mocks/session';
import { toKyc } from './dto';
import { bodyOf, idOf, invalid, listResponse, noContent, notFound, route, textOf } from './shared';
import { merchantStore } from './store';

export const kycRoutes: HttpHandler[] = [
  route('get', '/admin/kyc-submissions', async ({ request }) => {
    const store = await merchantStore();
    return listResponse(
      store.kyc.list().map((row) => toKyc(row, store)),
      request,
      ['status', 'note'],
    );
  }),

  route('get', '/admin/kyc-submissions/:id', async (call) => {
    const store = await merchantStore();
    const row = store.kyc.find(idOf(call));
    return row ? HttpResponse.json(toKyc(row, store)) : notFound('verification request', call.params.id);
  }),

  route('post', '/admin/kyc-submissions/:id/decide', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    const row = store.kyc.find(id);
    if (!row) return notFound('verification request', call.params.id);
    const body = await bodyOf(call.request);
    const decision = body.decision;
    const note = textOf(body.note);
    if (decision !== 'approve' && decision !== 'reject') {
      return invalid([{ field: 'decision', message: 'Choose approve or reject.' }]);
    }
    if (decision === 'reject' && !note)
      return invalid([{ field: 'note', message: 'Add a reason for the rejection.' }]);
    if (row.status !== 'pending') {
      return problem(409, 'ALREADY_DECIDED', 'Already decided', `This request was already ${row.status}.`);
    }
    const staff = await currentStaff();
    const status = decision === 'approve' ? 'approved' : 'rejected';
    store.kyc.patch(id, {
      status,
      note,
      reviewedAt: new Date().toISOString(),
      reviewedBy: { id: staff?.id ?? 0, name: staff?.name ?? 'Staff' },
    });
    store.clients.patch(row.clientId, { kycStatus: status });
    const updated = store.kyc.find(id);
    return updated ? HttpResponse.json(toKyc(updated, store)) : notFound('verification request', id);
  }),

  route('get', '/admin/clients/:id/api-keys', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    if (!store.clients.find(id)) return notFound('merchant', call.params.id);
    const keys = store.keys.list().filter((key) => key.clientId === id);
    return HttpResponse.json(keys.sort((a, b) => b.id - a.id));
  }),

  route('delete', '/admin/api-keys/:id', async (call) => {
    const store = await merchantStore();
    const key = store.keys.find(idOf(call));
    if (!key) return notFound('API key', call.params.id);
    if (key.revokedAt)
      return problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.');
    store.keys.patch(key.id, { revokedAt: new Date().toISOString() });
    return noContent();
  }),
];
