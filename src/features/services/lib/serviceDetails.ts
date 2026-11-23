// The values of the service details form (name, code, category, type, SLA, quantity, first price) and the body each save sends.
// Pure text-to-body mapping, used by the New/Edit service dialog and the panel's Details section; the server stays the authority.
import { toMoneyText } from './money';
import { quantityBody, quantityDefaults, type QuantityValues } from './quantity';
import type { CreateServiceBody, Service, ServiceType, UpdateServiceBody } from '../types';

/** What the form holds, as text. `basePrice` is typed only when a service is created; an edit has no box for it. */
export type ServiceDetailsValues = QuantityValues & {
  name: string;
  code: string;
  categoryId: string;
  type: ServiceType;
  slaMinutes: string;
  basePrice: string;
};

/** What the inputs start with: the service's own values, or the blank form of a new service (one per order, 60 minutes). */
export function serviceDetailsDefaults(service?: Service): ServiceDetailsValues {
  return {
    name: service?.name ?? '',
    code: service?.code ?? '',
    categoryId: service ? String(service.categoryId) : '',
    type: service?.type ?? 'imei',
    slaMinutes: String(service?.slaMinutes ?? 60),
    basePrice: '',
    ...quantityDefaults(service),
  };
}

/**
 * The names of the form's fields that have an error line under their input, so a server message about any other field still
 * shows in the error slot. The price input exists only while a service is created.
 */
export function serviceDetailsFields(creating: boolean): string[] {
  return [
    'name',
    'code',
    'categoryId',
    'type',
    'slaMinutes',
    'minQty',
    'maxQty',
    'qtyOptions',
    ...(creating ? ['basePrice'] : []),
  ];
}

/** The typed text as the values a save sends: trimmed words and whole numbers. */
function typed(values: ServiceDetailsValues) {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    categoryId: Number(values.categoryId),
    type: values.type,
    slaMinutes: Number(values.slaMinutes),
  };
}

/** The body of `POST /admin/services`: every field, the first price as the API's money text, and the quantity rule. */
export function createServiceBody(values: ServiceDetailsValues): CreateServiceBody {
  return { ...typed(values), basePrice: toMoneyText(values.basePrice), ...quantityBody(values) };
}

/** The body of `PATCH /admin/services/:id`: only what differs from the service. An empty object means nothing changed. */
export function updateServiceBody(values: ServiceDetailsValues, service: Service): UpdateServiceBody {
  const next = typed(values);
  const body: UpdateServiceBody = {};
  if (next.name !== service.name) body.name = next.name;
  if (next.code !== service.code) body.code = next.code;
  if (next.categoryId !== service.categoryId) body.categoryId = next.categoryId;
  if (next.type !== service.type) body.type = next.type;
  if (next.slaMinutes !== service.slaMinutes) body.slaMinutes = next.slaMinutes;
  return Object.assign(body, quantityBody(values, service));
}
