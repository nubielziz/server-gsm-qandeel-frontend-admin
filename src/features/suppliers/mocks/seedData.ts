// Fixed data of the suppliers mock: the services each supplier offers that the console has not imported, the demo's call paths
// as supplier actions, and the request and response bodies of a logged call.
import type { JsonValue } from '@/lib/api';

/** The services each supplier offers that the console has not imported (names only; costs are made up). */
export const EXTRAS: Record<number, [string, string, string][]> = {
  1: [
    ['Sprint USA Premium Unlock', 'USA', 'imei'],
    ['Telstra Australia Unlock', 'Australia', 'imei'],
    ['Rogers Canada Unlock', 'Canada', 'imei'],
  ],
  2: [
    ['Octoplus Credits x25', 'Credits', 'server'],
    ['Infinity-Box Credits x30', 'Credits', 'server'],
    ['Medusa Pro Credits x10', 'Credits', 'server'],
  ],
  3: [
    ['IMEI Carrier Check (All Brands)', 'Checks', 'imei'],
    ['Samsung Knox Guard Status', 'Checks', 'imei'],
    ['Apple SimLock Check', 'Checks', 'imei'],
  ],
  4: [
    ['Honor Account Remote', 'Remote', 'remote'],
    ['Oppo FRP Remote', 'Remote', 'remote'],
    ['Vivo FRP Remote', 'Remote', 'remote'],
  ],
  5: [
    ['Samsung Modem File', 'Files', 'file'],
    ['Oppo Flash Pack', 'Files', 'file'],
    ['Realme Auth File', 'Files', 'file'],
  ],
  6: [
    ['Telekom Germany Unlock', 'Europe', 'imei'],
    ['Turkcell Turkey Unlock', 'Turkey', 'imei'],
    ['Movistar Spain Unlock', 'Europe', 'imei'],
  ],
};

/** The demo's call paths as the supplier actions the API log shows. */
export const ACTIONS: Record<string, string> = {
  '/placeorder': 'placeimeiorder',
  '/getorder': 'getimeiorder',
  '/balance': 'accountinfo',
};

/** The request and the answer of a logged call, as the server would store them (the secrets are already masked). */
export function bodiesOf(action: string, orderId: number | null, code: number, message: string) {
  const request: JsonValue = {
    action,
    username: 'gsm-supply',
    apiaccesskey: '••••••••',
    ...(orderId ? { parameters: { REFERENCEID: String(orderId) } } : {}),
  };
  const response: JsonValue =
    code >= 200 && code < 300
      ? { SUCCESS: [{ MESSAGE: 'OK', ...(orderId ? { REFERENCEID: `R${orderId}` } : {}) }] }
      : { ERROR: [{ MESSAGE: message }] };
  return { request, response };
}

/** The supplier's own delivery time text for a service, from its SLA in minutes. */
export function deliveryText(minutes: number): string {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  if (minutes >= 1440) return plural(Math.round(minutes / 1440), 'day');
  return minutes >= 60 ? plural(Math.round(minutes / 60), 'hour') : `${minutes} min`;
}
