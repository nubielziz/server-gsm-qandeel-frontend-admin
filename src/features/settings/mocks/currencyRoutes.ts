// Mock of the currency routes (`/admin/currencies*`) and the rate refresh. The refresh moves each rate by a small fixed step and
// stamps the time. Tests that need a partly failed refresh answer the route themselves.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProblemError } from '@/mocks/problem';
import type { Currency, RefreshFxResult } from '../types';
import { bodyOf, fourDecimals, invalid, isDecimal, listAnswer, notFound, signedIn, textOf } from './http';
import { settingsFeatureStore } from './store';

const BASE = 'USD';

/** Applies the fields of a body to a currency, collecting the problems. */
function applyFields(
  row: Omit<Currency, 'id'>,
  body: Record<string, unknown>,
  taken: (code: string) => boolean,
  problems: ProblemError[],
) {
  const draft = { ...row };
  if ('code' in body) {
    const code = (textOf(body.code) ?? '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(code))
      problems.push({ field: 'code', message: 'Enter the three-letter code, such as GBP.' });
    else if (code !== row.code && taken(code))
      problems.push({ field: 'code', message: 'This currency is already in the list.' });
    else draft.code = code;
  }
  if ('name' in body) {
    draft.name = textOf(body.name) ?? '';
    if (!draft.name) problems.push({ field: 'name', message: 'Enter a name.' });
  }
  if ('rateToBase' in body) {
    if (isDecimal(body.rateToBase) && Number(body.rateToBase) > 0) {
      draft.rateToBase = fourDecimals(body.rateToBase);
      draft.rateUpdatedAt = new Date().toISOString();
    } else problems.push({ field: 'rateToBase', message: 'Enter a rate above zero.' });
  }
  if ('markupPercent' in body) {
    if (isDecimal(body.markupPercent) && Number(body.markupPercent) <= 10)
      draft.markupPercent = fourDecimals(body.markupPercent);
    else problems.push({ field: 'markupPercent', message: 'Enter a markup between 0 and 10.' });
  }
  if ('decimals' in body) {
    const decimals = Number(body.decimals);
    if (Number.isInteger(decimals) && decimals >= 0 && decimals <= 4) draft.decimals = decimals;
    else problems.push({ field: 'decimals', message: 'Enter 0 to 4 decimals.' });
  }
  for (const key of ['charmRounding', 'isStorefront', 'isActive'] as const)
    if (key in body) draft[key] = body[key] === true;
  return draft;
}

/** The currency routes. `refresh-fx` is a POST on its own path, so it cannot be mistaken for `/:id`. */
export const currencyRoutes: HttpHandler[] = [
  http.post('*/admin/currencies/refresh-fx', ({ request }) =>
    signedIn(request, async () => {
      const { currencies } = await settingsFeatureStore();
      const now = new Date().toISOString();
      const result: RefreshFxResult = { refreshed: [], failed: [], source: 'Mock reference rates' };
      for (const row of currencies.list()) {
        if (row.code === BASE) continue;
        const rate = fourDecimals(Number(row.rateToBase) * 1.002);
        currencies.patch(row.id, { rateToBase: rate, rateUpdatedAt: now });
        result.refreshed?.push({ code: row.code, rateToBase: rate, rateUpdatedAt: now });
      }
      return HttpResponse.json(result);
    }),
  ),

  http.get('*/admin/currencies', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await settingsFeatureStore()).currencies.list(), request, ['code', 'name']),
    ),
  ),

  http.get('*/admin/currencies/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).currencies.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('currency', params.id);
    }),
  ),

  http.post('*/admin/currencies', ({ request }) =>
    signedIn(request, async () => {
      const { currencies } = await settingsFeatureStore();
      const body = await bodyOf(request);
      const problems: ProblemError[] = [];
      const taken = (code: string) => currencies.list().some((row) => row.code === code);
      const blank: Omit<Currency, 'id'> = {
        code: '',
        name: '',
        rateToBase: '1.0000',
        rateUpdatedAt: new Date().toISOString(),
        markupPercent: '0.0000',
        charmRounding: false,
        isStorefront: false,
        decimals: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const draft = applyFields(blank, body, taken, problems);
      for (const key of ['code', 'name', 'rateToBase'] as const)
        if (!(key in body)) problems.push({ field: key, message: 'This field is required.' });
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(currencies.insert(draft), { status: 201 });
    }),
  ),

  http.patch('*/admin/currencies/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { currencies } = await settingsFeatureStore();
      const row = currencies.find(String(params.id));
      if (!row) return notFound('currency', params.id);
      const problems: ProblemError[] = [];
      const taken = (code: string) =>
        currencies.list().some((other) => other.id !== row.id && other.code === code);
      const draft = applyFields(row, await bodyOf(request), taken, problems);
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(currencies.patch(row.id, draft) ?? row);
    }),
  ),
];
