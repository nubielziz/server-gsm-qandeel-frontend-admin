// Mock of the TAC catalogue routes (`/admin/tac-catalog` and `/admin/tac-catalog/:id`): list with search, one entry, add and
// change. The mock plays the server: a TAC is 8 digits and appears once.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { TacEntry } from '../types';
import { bodyOf, conflict, invalid, listAnswer, notFound, signedIn, textOf } from './http';
import { storefrontStore } from './store';
import type { Stores } from './types';

const SEARCH_FIELDS = ['tac', 'brand', 'model', 'marketingName'];

/** The 409 for a TAC that is already in the catalogue. */
function tacTaken(tac: string) {
  const message = `The TAC ${tac} is already in the catalogue.`;
  return conflict('TAC_TAKEN', 'TAC already exists', message, [{ field: 'tac', message }]);
}

/** The TAC entry with this prefix, other than `exceptId`. */
function withTac(stores: Stores, tac: string, exceptId?: number): TacEntry | undefined {
  return stores.tac.list().find((entry) => entry.tac === tac && entry.id !== exceptId);
}

/** The TAC catalogue routes. */
export const tacRoutes: HttpHandler[] = [
  http.get('*/admin/tac-catalog', ({ request }) =>
    signedIn(request, async () => listAnswer((await storefrontStore()).tac.list(), request, SEARCH_FIELDS)),
  ),

  http.get('*/admin/tac-catalog/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const entry = (await storefrontStore()).tac.find(String(params.id));
      return entry ? HttpResponse.json(entry) : notFound('TAC', params.id);
    }),
  ),

  http.post('*/admin/tac-catalog', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const tac = textOf(body.tac);
      const brand = textOf(body.brand);
      const model = textOf(body.model);
      const errors = [];
      if (!/^\d{8}$/.test(tac)) errors.push({ field: 'tac', message: 'Enter exactly 8 digits.' });
      if (!brand) errors.push({ field: 'brand', message: 'Enter the brand.' });
      if (!model) errors.push({ field: 'model', message: 'Enter the model code.' });
      if (errors.length > 0) return invalid(errors);
      if (withTac(stores, tac)) return tacTaken(tac);
      const entry = stores.tac.insert({
        tac,
        brand,
        model,
        marketingName: textOf(body.marketingName),
        releaseYear: typeof body.releaseYear === 'number' ? body.releaseYear : 0,
        source: 'manual',
      });
      return HttpResponse.json(entry, { status: 201 });
    }),
  ),

  http.patch('*/admin/tac-catalog/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const entry = stores.tac.find(String(params.id));
      if (!entry) return notFound('TAC', params.id);
      const body = await bodyOf(request);
      const changes: Partial<TacEntry> = {};
      if ('tac' in body) {
        changes.tac = textOf(body.tac);
        if (!/^\d{8}$/.test(changes.tac))
          return invalid([{ field: 'tac', message: 'Enter exactly 8 digits.' }]);
        if (withTac(stores, changes.tac, entry.id)) return tacTaken(changes.tac);
      }
      if ('brand' in body) changes.brand = textOf(body.brand);
      if ('model' in body) changes.model = textOf(body.model);
      if ('marketingName' in body) changes.marketingName = textOf(body.marketingName);
      if (typeof body.releaseYear === 'number') changes.releaseYear = body.releaseYear;
      if (changes.brand === '' || changes.model === '') {
        return invalid([
          { field: changes.brand === '' ? 'brand' : 'model', message: 'This field cannot be empty.' },
        ]);
      }
      return HttpResponse.json(stores.tac.patch(entry.id, changes));
    }),
  ),
];
