// Mock of the tax rate routes (`/admin/tax-rates*`): list, show, create and update (the map has no delete). The mock checks the fields
// the way the real server would; it does not stop two rates for one country from overlapping.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProblemError } from '@/mocks/problem';
import type { TaxRate } from '../types';
import { bodyOf, fourDecimals, invalid, isDecimal, listAnswer, notFound, signedIn, textOf } from './http';
import { settingsFeatureStore } from './store';

/** Applies the fields of a body to a rate, collecting the problems. */
function applyFields(row: Omit<TaxRate, 'id'>, body: Record<string, unknown>, problems: ProblemError[]) {
  const draft = { ...row };
  if ('country' in body) {
    const country = (textOf(body.country) ?? '').toUpperCase();
    if (/^[A-Z]{2}$/.test(country)) draft.country = country;
    else problems.push({ field: 'country', message: 'Enter the two-letter country code, such as GB.' });
  }
  if ('ratePercent' in body) {
    if (isDecimal(body.ratePercent) && Number(body.ratePercent) <= 100)
      draft.ratePercent = fourDecimals(body.ratePercent);
    else problems.push({ field: 'ratePercent', message: 'Enter a rate from 0 to 100.' });
  }
  for (const key of ['region', 'taxType', 'appliesTo', 'label', 'ossScheme'] as const)
    if (key in body) draft[key] = textOf(body[key]) ?? '';
  if ('taxType' in body && !draft.taxType) problems.push({ field: 'taxType', message: 'Choose a tax type.' });
  for (const key of ['validFrom', 'validTo'] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value === null || value === '') draft[key] = null;
    else if (typeof value === 'string' && !Number.isNaN(Date.parse(value)))
      draft[key] = new Date(value).toISOString();
    else problems.push({ field: key, message: 'Enter a date.' });
  }
  if (!draft.validFrom) problems.push({ field: 'validFrom', message: 'Enter the date the rate starts.' });
  else if (draft.validTo && Date.parse(draft.validTo) < Date.parse(draft.validFrom))
    problems.push({ field: 'validTo', message: 'The end date cannot be before the start date.' });
  return draft;
}

/** The tax rate routes. */
export const taxRoutes: HttpHandler[] = [
  http.get('*/admin/tax-rates', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await settingsFeatureStore()).taxRates.list(), request, ['country', 'label']),
    ),
  ),

  http.get('*/admin/tax-rates/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).taxRates.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('tax rate', params.id);
    }),
  ),

  http.post('*/admin/tax-rates', ({ request }) =>
    signedIn(request, async () => {
      const { taxRates } = await settingsFeatureStore();
      const problems: ProblemError[] = [];
      const blank: Omit<TaxRate, 'id'> = {
        country: '',
        region: '',
        ratePercent: '0.0000',
        taxType: 'vat',
        appliesTo: 'digital_services',
        validFrom: null,
        validTo: null,
        label: '',
        ossScheme: '',
        createdAt: new Date().toISOString(),
      };
      const body = await bodyOf(request);
      const draft = applyFields(blank, body, problems);
      if (!('country' in body))
        problems.push({ field: 'country', message: 'Enter the two-letter country code, such as GB.' });
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(taxRates.insert(draft), { status: 201 });
    }),
  ),

  http.patch('*/admin/tax-rates/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { taxRates } = await settingsFeatureStore();
      const row = taxRates.find(String(params.id));
      if (!row) return notFound('tax rate', params.id);
      const problems: ProblemError[] = [];
      const draft = applyFields(row, await bodyOf(request), problems);
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(taxRates.patch(row.id, draft) ?? row);
    }),
  ),
];
