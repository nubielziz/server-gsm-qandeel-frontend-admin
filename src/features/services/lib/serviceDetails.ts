// The values of the service details (name, category, type, SLA, quantity) and the body an edit sends. Pure text-to-body mapping, used
// by the edit view's Overview part; the server stays the authority. The code is never sent: the server makes it and the Overview shows it.
import { quantityBody, type QuantityValues } from './quantity';
import type { Service, ServiceType, UpdateServiceBody } from '../types';

/** What the form holds, as text. `basePrice` is not part of an edit's body (the Set Pricing part saves the price). */
export type ServiceDetailsValues = QuantityValues & {
  name: string;
  categoryId: string;
  type: ServiceType;
  slaMinutes: string;
  basePrice: string;
};

/** The typed text as the values a save sends: trimmed words and whole numbers. */
function typed(values: ServiceDetailsValues) {
  return {
    name: values.name.trim(),
    categoryId: Number(values.categoryId),
    type: values.type,
    slaMinutes: Number(values.slaMinutes),
  };
}

/** The body of `PATCH /admin/services/:id`: only what differs from the service. An empty object means nothing changed. */
export function updateServiceBody(values: ServiceDetailsValues, service: Service): UpdateServiceBody {
  const next = typed(values);
  const body: UpdateServiceBody = {};
  if (next.name !== service.name) body.name = next.name;
  if (next.categoryId !== service.categoryId) body.categoryId = next.categoryId;
  if (next.type !== service.type) body.type = next.type;
  if (next.slaMinutes !== service.slaMinutes) body.slaMinutes = next.slaMinutes;
  return Object.assign(body, quantityBody(values, service));
}
