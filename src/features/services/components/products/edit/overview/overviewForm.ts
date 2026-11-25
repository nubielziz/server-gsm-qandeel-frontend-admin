// The values of the Overview part's form (status, name, code, group, delivery time, order handling, verification, cancel, code stock) and the body a
// save sends. The name, code, group and delivery time go through the existing details mapping (lib/serviceDetails.ts), so that one place
// decides how typed text becomes the API's body; this file adds only the switches the old dialog had no box for. The server stays the authority.
import { quantityDefaults } from '../../../../lib/quantity';
import { updateServiceBody, type ServiceDetailsValues } from '../../../../lib/serviceDetails';
import type { Service, UpdateServiceBody } from '../../../../types';
import { deliveryMinutes, deliveryOf, type DeliveryUnit } from '../../../../lib/delivery';

/** The longest verification window the API takes, in hours (30 days). */
export const MAX_VERIFY_WINDOW_H = 720;

/**
 * What the form holds. The switches are booleans: `active` (status), `auto` (order handling: automatic or manual), `verify` (a merchant may
 * ask for verification, with `verifyWindowH` hours as text), `cancel` (a merchant may cancel an order that was never sent) and
 * `stockDelivery` ("Delivered from code stock": the service holds codes and its orders take one first).
 */
export type OverviewValues = {
  active: boolean;
  name: string;
  code: string;
  categoryId: string;
  delivery: string;
  unit: DeliveryUnit;
  auto: boolean;
  verify: boolean;
  verifyWindowH: string;
  cancel: boolean;
  stockDelivery: boolean;
};

/** What the inputs start with: the service's own values. */
export function overviewDefaults(service: Service): OverviewValues {
  return {
    active: service.status === 'active',
    name: service.name,
    code: service.code,
    categoryId: String(service.categoryId),
    ...deliveryOf(service.slaMinutes),
    auto: service.executionMode === 'auto',
    verify: service.allowVerify,
    verifyWindowH: String(service.verifyWindowH),
    cancel: service.allowCancel,
    stockDelivery: service.stockDelivery,
  };
}

/** The names of the form's fields, each with an error line in its row, so a server message about any other field shows in the error slot. */
export const OVERVIEW_FIELDS: readonly string[] = [
  'name',
  'code',
  'categoryId',
  'delivery',
  'verifyWindowH',
  'active',
  'auto',
  'verify',
  'cancel',
  'stockDelivery',
];

/** The API field names the form names differently: the delivery time is stored as `slaMinutes`, and each switch has its own key. */
export const OVERVIEW_ALIASES: Readonly<Record<string, string>> = {
  slaMinutes: 'delivery',
  status: 'active',
  executionMode: 'auto',
  allowVerify: 'verify',
  allowCancel: 'cancel',
};

// The fields of the details mapping, filled from this form; the type and the quantity rule stay as the service has them.
function detailsOf(values: OverviewValues, service: Service): ServiceDetailsValues {
  return {
    ...quantityDefaults(service),
    name: values.name,
    code: values.code,
    categoryId: values.categoryId,
    type: service.type,
    slaMinutes: String(deliveryMinutes(values.delivery, values.unit) ?? service.slaMinutes),
    basePrice: '',
  };
}

/**
 * The body of `PATCH /admin/services/:id` for a save: only what differs from `service`. An empty object means nothing changed. The
 * verification window is sent only while verification is on (a window typed and then switched off is not a change).
 */
export function overviewBody(values: OverviewValues, service: Service): UpdateServiceBody {
  const body = updateServiceBody(detailsOf(values, service), service);
  const status = values.active ? 'active' : 'disabled';
  if (status !== service.status) body.status = status;
  const mode = values.auto ? 'auto' : 'manual';
  if (mode !== service.executionMode) body.executionMode = mode;
  if (values.verify !== service.allowVerify) body.allowVerify = values.verify;
  if (values.verify && /^\d+$/.test(values.verifyWindowH.trim())) {
    const hours = Number(values.verifyWindowH);
    if (hours !== service.verifyWindowH) body.verifyWindowH = hours;
  }
  if (values.cancel !== service.allowCancel) body.allowCancel = values.cancel;
  if (values.stockDelivery !== service.stockDelivery) body.stockDelivery = values.stockDelivery;
  return body;
}

/** The message under the verification window box, or true when it is fine (or verification is off). */
export function windowProblem(values: Pick<OverviewValues, 'verify' | 'verifyWindowH'>): string | true {
  if (!values.verify) return true;
  const text = values.verifyWindowH.trim();
  return /^\d+$/.test(text) && Number(text) <= MAX_VERIFY_WINDOW_H
    ? true
    : `Enter hours, 0 to ${MAX_VERIFY_WINDOW_H}.`;
}
