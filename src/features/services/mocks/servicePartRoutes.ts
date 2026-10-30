// Mock of the three "replace the whole list" routes of a service: custom fields, option lists and group prices
// (`PUT /admin/services/:id/fields|options|group-prices`). Each checks its list the way a server would and answers with the saved list.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toMoney } from '@/mocks/seed';
import { bodyOf, idOf, invalid, notFound, signedIn } from './http';
import { servicesStore } from './store';
import type { ServiceField, ServiceGroupPrice, ServiceOption } from '../types';

const FIELD_TYPES = ['text', 'number', 'select', 'textarea'];
const OPTION_LISTS = ['model', 'network', 'mep'];

const rowsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    : [];

/** The fields, options and group prices routes. */
export const servicePartRoutes: HttpHandler[] = [
  http.put('*/admin/services/:id/fields', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const service = stores.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const rows = rowsOf((await bodyOf(request)).fields);
      const problems: { field: string; message: string }[] = [];
      const seen = new Set<string>();
      const fields: ServiceField[] = rows.map((row, index) => {
        const key = String(row.key ?? '').trim();
        if (!key) problems.push({ field: `fields.${index}.key`, message: 'Enter a key.' });
        else if (seen.has(key))
          problems.push({ field: `fields.${index}.key`, message: `The key ${key} is used twice.` });
        seen.add(key);
        if (!String(row.label ?? '').trim())
          problems.push({ field: `fields.${index}.label`, message: 'Enter a label.' });
        if (!FIELD_TYPES.includes(String(row.fieldType))) {
          problems.push({ field: `fields.${index}.fieldType`, message: 'Choose a type.' });
        }
        return {
          key,
          label: String(row.label ?? '').trim(),
          fieldType: row.fieldType as ServiceField['fieldType'],
          required: row.required === true,
          options: Array.isArray(row.options) ? row.options.map(String) : [],
          regex: String(row.regex ?? ''),
          supplierKey: String(row.supplierKey ?? ''),
        };
      });
      if (problems.length > 0) return invalid(problems);
      service.fields = fields;
      return HttpResponse.json(fields);
    }),
  ),

  http.put('*/admin/services/:id/options', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const service = stores.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const rows = rowsOf((await bodyOf(request)).options);
      const problems: { field: string; message: string }[] = [];
      const options: ServiceOption[] = rows.map((row, index) => {
        if (!OPTION_LISTS.includes(String(row.list)))
          problems.push({ field: `options.${index}.list`, message: 'Unknown list.' });
        if (!String(row.value ?? '').trim())
          problems.push({ field: `options.${index}.value`, message: 'Enter a value.' });
        return {
          list: row.list as ServiceOption['list'],
          value: String(row.value ?? '').trim(),
          label: String(row.label ?? '').trim(),
          supplierValue: String(row.supplierValue ?? '').trim(),
        };
      });
      if (problems.length > 0) return invalid(problems);
      service.options = options;
      return HttpResponse.json(options);
    }),
  ),

  http.put('*/admin/services/:id/group-prices', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const service = stores.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const rows = rowsOf((await bodyOf(request)).prices);
      const problems: { field: string; message: string }[] = [];
      const prices: ServiceGroupPrice[] = [];
      for (const [index, row] of rows.entries()) {
        const groupId = idOf(row.groupId);
        const price = Number(row.price);
        // The merchants feature owns the groups, so any positive whole number is taken as a group.
        if (groupId === null) {
          problems.push({ field: `prices.${index}.groupId`, message: 'Choose a merchant group.' });
        } else if (!Number.isFinite(price) || price <= 0) {
          problems.push({ field: `prices.${index}.price`, message: 'Enter a price greater than zero.' });
        } else {
          prices.push({ groupId, price: toMoney(price) });
        }
      }
      if (problems.length > 0) return invalid(problems);
      service.groupPrices = prices;
      return HttpResponse.json(prices);
    }),
  ),
];
