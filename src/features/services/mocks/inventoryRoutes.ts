// Mock of the code inventory routes: the masked list (`GET /admin/inventory-codes`), the import with duplicate detection
// (`POST /admin/services/:id/inventory/import`) and the void action (`POST /admin/inventory-codes/void`). The mock plays the server:
// it masks the codes, counts what it imported, found twice or could not read, and voids only unsold codes.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toCode } from './dto';
import { bodyOf, idOf, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { servicesStore } from './store';

/** The shortest line the mock reads as a code. */
const MIN_CODE_LENGTH = 6;

/** The inventory list, import and void routes. */
export const inventoryRoutes: HttpHandler[] = [
  http.get('*/admin/inventory-codes', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const rows = stores.codes.list().map((row) => toCode(stores, row));
      // Newest first unless the request says otherwise.
      const params = new URL(request.url).searchParams;
      if (!params.has('_sort')) rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
      return listAnswer(rows, request, ['maskedCode', 'service.name', 'batchRef']);
    }),
  ),

  http.post('*/admin/services/:id/inventory/import', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const service = stores.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const body = await bodyOf(request);
      const codes = Array.isArray(body.codes) ? body.codes.map((code) => String(code).trim()) : [];
      if (codes.length === 0) return invalid([{ field: 'codes', message: 'Add at least one code.' }]);
      const batchRef = textOf(body.batchRef) || `B-${String(stores.codes.size + 1).padStart(4, '0')}`;
      const known = new Set(stores.codes.list().map((row) => row.code));
      let imported = 0;
      let duplicates = 0;
      let rejected = 0;
      for (const code of codes) {
        if (code.length < MIN_CODE_LENGTH || /\s/.test(code)) rejected += 1;
        else if (known.has(code)) duplicates += 1;
        else {
          known.add(code);
          imported += 1;
          stores.codes.insert({
            serviceId: service.id,
            code,
            status: 'available',
            orderId: null,
            batchRef,
            createdAt: new Date().toISOString(),
          });
        }
      }
      return HttpResponse.json({ imported, duplicates, rejected, batchRef });
    }),
  ),

  http.post('*/admin/inventory-codes/void', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const body = await bodyOf(request);
      const ids = (Array.isArray(body.ids) ? (body.ids as unknown[]) : [])
        .map(idOf)
        .filter((id): id is number => id !== null);
      if (ids.length === 0) return invalid([{ field: 'ids', message: 'Tick at least one code.' }]);
      let voided = 0;
      let skipped = 0;
      for (const id of ids) {
        const row = stores.codes.find(id);
        if (row?.status === 'available') {
          stores.codes.patch(id, { status: 'void' });
          voided += 1;
        } else skipped += 1;
      }
      return HttpResponse.json({ voided, skipped });
    }),
  ),
];
