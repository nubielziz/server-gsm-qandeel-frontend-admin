// The values of the +Add Service form (a service made by hand), as typed text, and what they become: the body of the one create call, the
// body of the one update that follows it, the checks that run before the server is called and the settings a chosen service copies in.
// Pure text-to-body mapping; the server stays the authority (the create route takes no status or order handling, so those two go in the update).
import {
  deliveryMinutes,
  deliveryOf,
  deliveryProblem as timeProblem,
  type DeliveryUnit,
} from '../../../lib/delivery';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from '../../../lib/money';
import type { CreateServiceBody, Service, ServiceType, UpdateServiceBody } from '../../../types';

/** The longest verification window the server accepts, in hours (30 days). */
export const MAX_VERIFY_WINDOW_H = 720;
/** What the window box holds when "Send For Verification" is switched on and the form has no other figure for it. */
export const DEFAULT_VERIFY_WINDOW_H = '24';

/**
 * What the form holds. The switches are booleans: `active` (Active or Inactive), `automatic` (Automatic or Manual order handling),
 * `verify` (Send For Verification) and `cancel` (User Can Cancel Order). The rest is text: `categoryId` is the number of the chosen group,
 * `deliveryAmount` and `deliveryUnit` the delivery time, `credit` the base price in USD and `verifyWindowH` the hours after completion in
 * which a merchant may ask for verification (used only while `verify` is on). `ownCost` is "Your cost" in USD (empty: none given) and
 * `stockDelivery` is "Delivered from code stock".
 */
export type AddServiceValues = {
  name: string;
  code: string;
  categoryId: string;
  active: boolean;
  automatic: boolean;
  verify: boolean;
  verifyWindowH: string;
  cancel: boolean;
  deliveryAmount: string;
  deliveryUnit: DeliveryUnit;
  credit: string;
  ownCost: string;
  stockDelivery: boolean;
};

/**
 * The blank form. The switches start as the server starts a new service (Active, Automatic, no verification, no cancel); the name, code,
 * group, delivery time and credit are typed (the server refuses a zero credit and a zero delivery time, so there is no default for them).
 * Your cost starts empty (the server's 0) and a service is not delivered from code stock until the person says so.
 */
export function addServiceDefaults(): AddServiceValues {
  return {
    name: '',
    code: '',
    categoryId: '',
    active: true,
    automatic: true,
    verify: false,
    verifyWindowH: DEFAULT_VERIFY_WINDOW_H,
    cancel: false,
    deliveryAmount: '',
    deliveryUnit: 'minutes',
    credit: '',
    ownCost: '',
    stockDelivery: false,
  };
}

/** The names of the form's fields, so a server message about any other field shows in the error slot. */
export const ADD_SERVICE_FIELDS: readonly string[] = [
  'name',
  'code',
  'categoryId',
  'active',
  'automatic',
  'verify',
  'verifyWindowH',
  'cancel',
  'deliveryAmount',
  'deliveryUnit',
  'credit',
  'ownCost',
  'stockDelivery',
];

/** The API's field names that the form calls something else, for `applyServerErrors`. */
export const ADD_SERVICE_ALIASES: Readonly<Record<string, string>> = {
  slaMinutes: 'deliveryAmount',
  basePrice: 'credit',
  status: 'active',
  executionMode: 'automatic',
  allowVerify: 'verify',
  allowCancel: 'cancel',
};

/** Stored minutes as the box and unit they read best in (lib/delivery.ts): whole days, else whole hours, else minutes (`180` is 3 hours). */
export function deliveryFields(minutes: number): Pick<AddServiceValues, 'deliveryAmount' | 'deliveryUnit'> {
  const { delivery, unit } = deliveryOf(minutes);
  return { deliveryAmount: delivery, deliveryUnit: unit };
}

/** The message under Delivery Time, or true when it is fine (the same check as the Overview part's). */
export function deliveryProblem(
  values: Pick<AddServiceValues, 'deliveryAmount' | 'deliveryUnit'>,
): string | true {
  return timeProblem(values.deliveryAmount, values.deliveryUnit);
}

/** The message under Credit, or true when it is fine (an amount above zero: the server refuses a service that costs nothing to buy). */
export function creditProblem(credit: string): string | true {
  return isMoneyText(credit) && Number(credit) > 0 ? true : 'Enter a credit greater than zero.';
}

/** The message under Your cost, or true when it is fine: empty (none given) or an amount of 0 or more. */
export function ownCostProblem(ownCost: string): string | true {
  return ownCost.trim() === '' || isMoneyText(ownCost) ? true : 'Enter an amount, 0 or more.';
}

/** The message under the verification window, or true when it is fine or the window does not apply (verification is off). */
export function windowProblem(values: Pick<AddServiceValues, 'verify' | 'verifyWindowH'>): string | true {
  if (!values.verify) return true;
  const text = values.verifyWindowH.trim();
  const hours = /^\d+$/.test(text) ? Number(text) : Number.NaN;
  return hours >= 1 && hours <= MAX_VERIFY_WINDOW_H ? true : `Enter the hours, 1 to ${MAX_VERIFY_WINDOW_H}.`;
}

/**
 * The body of `POST /admin/services`: the typed words, the group, the delivery time in minutes and the credit as the API's money text. The
 * cancel and verification keys are sent only when they are on (the server starts a service with both off and no window); so are
 * `stockDelivery` (it starts off) and `ownCost` (only when a figure was typed: the server starts it at 0).
 */
export function createBody(values: AddServiceValues, type: ServiceType): CreateServiceBody {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    categoryId: Number(values.categoryId),
    type,
    slaMinutes: deliveryMinutes(values.deliveryAmount, values.deliveryUnit) ?? 0,
    basePrice: toMoneyText(values.credit),
    ...(values.ownCost.trim() !== '' ? { ownCost: toMoneyText(values.ownCost) } : {}),
    ...(values.stockDelivery ? { stockDelivery: true } : {}),
    ...(values.cancel ? { allowCancel: true } : {}),
    ...(values.verify ? { allowVerify: true, verifyWindowH: Number(values.verifyWindowH.trim()) } : {}),
  };
}

/**
 * The one update that follows the create, or null when the service is already as the form says. The create route starts every service
 * Active and Automatic, so an Inactive or Manual service needs this second call (`PATCH /admin/services/:id`, `catalog:update`).
 */
export function followUpBody(
  values: Pick<AddServiceValues, 'active' | 'automatic'>,
): UpdateServiceBody | null {
  const body: UpdateServiceBody = {};
  if (!values.active) body.status = 'disabled';
  if (!values.automatic) body.executionMode = 'manual';
  return Object.keys(body).length > 0 ? body : null;
}

/** What the follow-up update sets, in words for a message: "status", "order handling" or "status and order handling". */
export function followUpWords(body: UpdateServiceBody): string {
  return [body.status ? 'status' : null, body.executionMode ? 'order handling' : null]
    .filter((word): word is string => word !== null)
    .join(' and ');
}

/**
 * The settings a chosen service gives the form ("- Select -"): its group, status, order handling, verification and window, cancel, delivery time,
 * credit, "Delivered from code stock" and its own cost (an own cost of 0 leaves the box empty, as for a service with none). Not its name or code
 * (they are typed: a code must be new) and not its quantity rule (the editor's Field part owns it).
 * `switches: false` leaves Status and Order handling out: the update that sets them needs `catalog:update`, and a copy must never put a
 * value in the form that the role cannot send (the create route would start the service Active and Automatic, whatever the form showed).
 */
export function copiedSettings(
  service: Service,
  { switches = true }: { switches?: boolean } = {},
): Partial<AddServiceValues> {
  return {
    categoryId: String(service.categoryId),
    ...(switches ? { active: service.status === 'active', automatic: service.executionMode === 'auto' } : {}),
    verify: service.allowVerify,
    verifyWindowH:
      service.allowVerify && service.verifyWindowH > 0
        ? String(service.verifyWindowH)
        : DEFAULT_VERIFY_WINDOW_H,
    cancel: service.allowCancel,
    ...deliveryFields(service.slaMinutes),
    credit: moneyInput(service.basePrice),
    ownCost: sameMoney(service.ownCost, '0') ? '' : moneyInput(service.ownCost),
    stockDelivery: service.stockDelivery,
  };
}
