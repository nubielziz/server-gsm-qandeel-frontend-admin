// Mock of the two "replace the whole list" routes of a service: custom fields and group prices
// (`PUT /admin/services/:id/fields|group-prices`). Each checks its list the way a server would and answers with the saved list.
// The fields route plays the server's naming rules: a row with the key of a saved field is that field, a row without a key is new and
// gets a key made from its name, an unknown key is refused, a name may be used once in a service whatever its letter case, and on an
// IMEI service a field named IMEI is the main input when no row is flagged. A field may be of any of the fifteen types on any service type,
// and of nothing else. The mock only names the types (it keeps the choices of a choice list); the server judges the answers of an order.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { toMoney } from '@/mocks/seed';
import { bodyOf, idOf, invalid, notFound, signedIn } from './http';
import { servicesStore } from './store';
import type { ServiceField, ServiceGroupPrice } from '../types';
import { RETAIL_GROUP_KIND } from '../lib/groupPrices';

const FIELD_TYPES = [
  'text',
  'number',
  'select',
  'textarea',
  'imei',
  'imei_bulk',
  'imeisv',
  'serial',
  'iccid',
  'eid',
  'meid',
  'ecid',
  'mac_address',
  'mi_lock_code',
  'box_sn',
];
/** The longest hidden key and the longest name a field may have (the server's limits). */
const KEY_MAX = 60;
const NAME_MAX = 120;
/** Money on the wire: a decimal with exactly four fraction digits. */
const MONEY_WIRE = /^-?\d+\.\d{4}$/;

/** The hidden key the server makes from a name: lower snake case, 60 characters at most, `field` when nothing is left. */
function keyBase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, KEY_MAX) || 'field'
  );
}

/** The first of `base`, `base_2`, `base_3`... that `used` does not hold, the base cut so the key stays within the limit. */
function freeKey(base: string, used: ReadonlySet<string>): string {
  let key = base.slice(0, KEY_MAX);
  for (let n = 2; used.has(key); n += 1) {
    const suffix = `_${n}`;
    key = `${base.slice(0, KEY_MAX - suffix.length)}${suffix}`;
  }
  return key;
}

const rowsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    : [];

/**
 * Plays the server's `retailPriceSeen` rule: when the retail row sent is the figure the form loaded (or absent, when it loaded
 * none), nobody touched the retail box, so the retail price stored now stays whatever the row says. Without the key every row
 * counts as sent. The mock compares numbers; the real server compares exact decimals.
 */
function keepUntouchedRetail(
  rows: ServiceGroupPrice[],
  stored: readonly ServiceGroupPrice[],
  retailGroupId: number | undefined,
  seen: unknown,
): ServiceGroupPrice[] {
  if (seen === undefined || retailGroupId === undefined) return rows;
  const sent = rows.find((row) => row.groupId === retailGroupId)?.price ?? null;
  const untouched = sent === null || seen === null ? sent === seen : Number(sent) === Number(seen);
  if (!untouched) return rows;
  const kept = stored.find((row) => row.groupId === retailGroupId);
  return [...rows.filter((row) => row.groupId !== retailGroupId), ...(kept ? [kept] : [])];
}

/** The fields and group prices routes. */
export const servicePartRoutes: HttpHandler[] = [
  http.put('*/admin/services/:id/fields', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const service = stores.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const rows = rowsOf((await bodyOf(request)).fields);
      const saved = new Map(service.fields.map((field) => [field.key, field]));
      const problems: { field: string; message: string }[] = [];
      const seenKeys = new Set<string>();
      const seenNames = new Set<string>();
      // Every saved key stays taken, kept or not, so a key never comes back for another field.
      const usedKeys = new Set(saved.keys());
      let mainInputs = 0;
      const fields: ServiceField[] = rows.map((row, index) => {
        const name = String(row.name ?? '').trim();
        const given = typeof row.key === 'string' ? row.key.trim() : '';
        const before = given ? saved.get(given) : undefined;
        if (given && !before) {
          problems.push({
            field: `fields.${index}.key`,
            message: 'This field no longer exists. Reload the page.',
          });
        } else if (given && seenKeys.has(given)) {
          problems.push({ field: `fields.${index}.key`, message: `The key ${given} is used twice.` });
        }
        seenKeys.add(given);
        if (!name) problems.push({ field: `fields.${index}.name`, message: 'Enter a name.' });
        else if (name.length > NAME_MAX) {
          problems.push({ field: `fields.${index}.name`, message: `Use at most ${NAME_MAX} characters.` });
        } else if (seenNames.has(name.toLowerCase())) {
          problems.push({
            field: `fields.${index}.name`,
            message: `The name ${name} is used by an earlier field.`,
          });
        }
        seenNames.add(name.toLowerCase());
        if (!FIELD_TYPES.includes(String(row.fieldType))) {
          problems.push({ field: `fields.${index}.fieldType`, message: 'Choose a type.' });
        }
        const isMainInput =
          typeof row.isMainInput === 'boolean' ? row.isMainInput : (before?.isMainInput ?? false);
        if (isMainInput) {
          mainInputs += 1;
          if (mainInputs > 1) {
            problems.push({
              field: `fields.${index}.isMainInput`,
              message: 'Only one field can be the main input.',
            });
          }
        }
        // The label: typed wins, an empty text is the name, a label left out keeps the saved one.
        const label = typeof row.label === 'string' ? row.label.trim() || name : (before?.label ?? name);
        const key = before ? given : freeKey(keyBase(name), usedKeys);
        usedKeys.add(key);
        return {
          key,
          name,
          label,
          fieldType: row.fieldType as ServiceField['fieldType'],
          required: row.required === true,
          options: Array.isArray(row.options) ? row.options.map(String) : [],
          regex: String(row.regex ?? ''),
          isMainInput,
        };
      });
      if (problems.length > 0) return invalid(problems);
      // On an IMEI service a field named IMEI (any letter case) is the IMEI itself: it is the main input when no row is flagged.
      const imeiRow =
        service.type === 'imei' && !fields.some((field) => field.isMainInput)
          ? fields.find((field) => field.name.toLowerCase() === 'imei')
          : undefined;
      service.fields = fields.map((field) => (field === imeiRow ? { ...field, isMainInput: true } : field));
      return HttpResponse.json(service.fields);
    }),
  ),

  http.put('*/admin/services/:id/group-prices', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const service = stores.services.find(String(params.id));
      if (!service) return notFound('service', params.id);
      const body = await bodyOf(request);
      const rows = rowsOf(body.prices);
      const seen = body.retailPriceSeen;
      const problems: { field: string; message: string }[] = [];
      const prices: ServiceGroupPrice[] = [];
      if (seen !== undefined && seen !== null && !(typeof seen === 'string' && MONEY_WIRE.test(seen))) {
        problems.push({
          field: 'retailPriceSeen',
          message: 'Must be a decimal amount with exactly 4 decimals, like 12.4900.',
        });
      }
      for (const [index, row] of rows.entries()) {
        const groupId = idOf(row.groupId);
        const price = Number(row.price);
        // The accounts feature owns the groups, so any positive whole number is taken as a group.
        if (groupId === null) {
          problems.push({ field: `prices.${index}.groupId`, message: 'Choose a rank.' });
        } else if (!Number.isFinite(price) || price <= 0) {
          problems.push({ field: `prices.${index}.price`, message: 'Enter a price greater than zero.' });
        } else {
          prices.push({ groupId, price: toMoney(price) });
        }
      }
      if (problems.length > 0) return invalid(problems);
      const retail = stores.groups.find((group) => group.kind === RETAIL_GROUP_KIND);
      service.groupPrices = keepUntouchedRetail(prices, service.groupPrices, retail?.id, seen);
      return HttpResponse.json(service.groupPrices);
    }),
  ),
];
